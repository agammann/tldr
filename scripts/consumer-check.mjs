import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { isolatedSession } from './test-session.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { directory, env } = await isolatedSession();
const output = join(root, 'test-results/consumer'); mkdirSync(output, { recursive: true });
const fixture = readFileSync(join(root, 'examples/fictional-terms.txt'), 'utf8');
const metadata = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
let client;
const report = { method: 'Actual SDK stdio service launched from outside its source directory; complete source/diff, restart and whole local-data backup recovery.', checks: {} };
async function connect() {
  client = new Client({ name: 'tldr-download-consumer', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(root, 'src/server.mjs')], cwd: tmpdir(), env, stderr: 'pipe' }));
  assert.equal(client.getServerVersion().version, metadata.version);
}
async function capture(text, selection = false) {
  const pairing = JSON.parse(readFileSync(join(directory, 'pairing.json'), 'utf8'));
  const response = await fetch(pairing.endpoint + '/capture', { method: 'POST', headers: { Authorization: 'Bearer ' + pairing.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com/fictional-terms', title: 'Fictional terms', text, links: [], captured_at: new Date().toISOString(), truncated: false, selection }) });
  assert.equal(response.status, 200);
}
try {
  await connect();
  report.tools = (await client.listTools()).tools.map(tool => tool.name).sort();
  assert.deepEqual(report.tools, ['compare_terms_text', 'read_review_page', 'review_current_page', 'review_terms_text', 'review_terms_url']);
  const missing = await client.callTool({ name: 'review_current_page', arguments: {} });
  assert(missing.isError); assert.match(missing.content[0].text, /No page captured/);
  const malformed = await client.callTool({ name: 'review_terms_text', arguments: { text: '' } });
  assert(malformed.isError);
  const expired = await client.callTool({ name: 'read_review_page', arguments: { review_id: '00000000-0000-4000-8000-000000000000', page: 1 } });
  assert(expired.isError); assert.match(expired.content[0].text, /expired or unavailable/);
  report.checks.absentMalformedExpiredSource = true;
  const supplied = (await client.callTool({ name: 'review_terms_text', arguments: { text: fixture } })).structuredContent;
  assert.equal(supplied.source_clauses.map(c => c.text).join('\n\n'), fixture.trim());
  const revised = fixture.replace('$12', '$24').replace('We do not use your notes', 'We use your notes');
  const compared = (await client.callTool({ name: 'compare_terms_text', arguments: { before: fixture, after: revised } })).structuredContent;
  assert.equal(compared.changes.status, 'text_changed');
  assert.deepEqual(compared.changes.added.map(c => c.text), compared.source_clauses.filter(c => c.text.includes('$24') || c.text.includes('We use your notes')).map(c => c.text));
  assert.deepEqual(compared.changes.removed.map(c => c.text), supplied.source_clauses.filter(c => c.text.includes('$12') || c.text.includes('We do not use your notes')).map(c => c.text));
  assert(compared.changes.removed.every(c => c.id.startsWith('OLD_C')));
  report.checks.exactQuotedRevisionDifferences = true;
  await capture(fixture);
  assert.equal((await client.callTool({ name: 'review_current_page', arguments: {} })).structuredContent.changes.status, 'first_review');
  await client.close();
  const historyFile = join(directory, 'history.json'), pairingFile = join(directory, 'pairing.json');
  const history = readFileSync(historyFile), pairing = readFileSync(pairingFile);
  await connect();
  assert((await client.callTool({ name: 'review_current_page', arguments: {} })).isError);
  await capture(fixture);
  assert.equal((await client.callTool({ name: 'review_current_page', arguments: {} })).structuredContent.changes.status, 'unchanged');
  await capture(revised);
  assert.equal((await client.callTool({ name: 'review_current_page', arguments: {} })).structuredContent.changes.status, 'text_changed');
  await capture('Selected text only.', true);
  assert.equal((await client.callTool({ name: 'review_current_page', arguments: {} })).structuredContent.changes.status, 'comparison_skipped_partial_capture');
  report.checks.restartAndPartialBaseline = true;
  await client.close();
  writeFileSync(historyFile, history); writeFileSync(pairingFile, pairing);
  await connect(); await capture(fixture);
  assert.equal((await client.callTool({ name: 'review_current_page', arguments: {} })).structuredContent.changes.status, 'unchanged');
  assert.equal(readFileSync(pairingFile).compare(pairing), 0);
  report.checks.actualStoppedDataBackupRestore = true;
  const longText = Array.from({ length: 80 }, (_, i) => `Clause ${i}. ${'These fees renew monthly. '.repeat(30)}`.trim()).join('\n\n');
  const long = (await client.callTool({ name: 'review_terms_text', arguments: { text: longText } })).structuredContent;
  assert(long.pagination.total_pages > 1); const clauses = [...long.source_clauses];
  for (let page = 2; page <= long.pagination.total_pages; page++) clauses.push(...(await client.callTool({ name: 'read_review_page', arguments: { review_id: long.pagination.review_id, page } })).structuredContent.source_clauses);
  assert.equal(clauses.map(c => c.text).join('\n\n'), longText);
  report.checks.completeImmutableSourcePaging = { pages: long.pagination.total_pages, clauses: clauses.length };
  const blocked = await client.callTool({ name: 'review_terms_url', arguments: { url: 'https://127.0.0.1' } });
  assert(blocked.isError); assert.match(blocked.content[0].text, /Private or reserved/);
  report.checks.unsupportedDestinationClearOutcome = true;
  report.baselineSha256 = createHash('sha256').update(history).digest('hex');
  report.version = metadata.version; report.outcome = 'pass';
} catch (error) { report.outcome = 'failure'; report.failure = error.message; process.exitCode = 1; }
finally {
  await client?.close();
  const owned = resolve(directory);
  if (!owned.startsWith(resolve(tmpdir()) + sep) || !owned.startsWith(join(resolve(tmpdir()), 'tldr-check-'))) throw Error('Unexpected private consumer directory.');
  rmSync(owned, { recursive: true, force: true });
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
}
