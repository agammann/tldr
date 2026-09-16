import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reviewText, MAX_TEXT } from '../src/review.mjs';
import { compareTexts, History } from '../src/history.mjs';
import { validateUrl, isPublicAddress, resolvePublic, extractPage } from '../src/fetch.mjs';
import { startBridge, loadPairing } from '../src/bridge.mjs';

const fixture = readFileSync(new URL('../examples/fictional-terms.txt', import.meta.url), 'utf8');
test('all terms and exceptions are preserved in cited evidence', () => {
  const report = reviewText(fixture);
  assert.equal(report.source_clauses.map(c => c.text).join('\n\n'), fixture.trim());
  assert.ok(report.source_clauses.find(c => c.text.includes('We do not use your notes')));
  assert.ok(report.source_clauses.find(c => c.text.includes('except claims eligible')));
  for (const topic of report.topic_index) for (const id of topic.clause_ids) assert.ok(report.source_clauses.find(c => c.id === id));
  assert.ok(report.coverage.referenced_material_clause_ids.length > 0);
});
test('oversized input rejected and long paragraphs remain fully represented', () => {
  assert.throws(() => reviewText('x'.repeat(MAX_TEXT + 1)), /exceed/);
  const text = 'a'.repeat(4000);
  assert.equal(reviewText(text).source_clauses.map(c => c.text).join(''), text);
});
test('no keyword match never asserts a clause is absent', () => {
  const report = reviewText('A short welcome message.');
  assert.ok(report.topic_index.every(t => t.status === 'no_keyword_match'));
  assert.match(report.summary_instructions, /never proof of absence/);
});
test('changes preserve old and new prices and negation', () => {
  const after = fixture.replace('$12', '$24').replace('We do not use your notes', 'We use your notes');
  const changes = compareTexts(fixture, after);
  assert.equal(changes.status, 'text_changed');
  assert.ok(changes.added.some(c => c.text.includes('$24')));
  assert.ok(changes.removed.some(c => c.text.includes('$12') && c.id.startsWith('OLD_')));
  assert.ok(changes.removed.some(c => c.text.includes('do not use')));
});
test('unchanged, reordering and duplicate removal are distinct', () => {
  assert.equal(compareTexts(fixture, fixture).status, 'unchanged');
  assert.equal(compareTexts('One\n\nTwo', 'Two\n\nOne').status, 'order_or_format_changed');
  assert.equal(compareTexts('One\n\nOne', 'One').removed.length, 1);
});
test('history has first review, change and unchanged states across instances', () => {
  const directory = mkdtempSync(join(tmpdir(), 'terms-history-'));
  const history = new History(directory);
  const metadata = { final_url: 'https://example.com/terms' };
  assert.equal(history.review(fixture, metadata).changes.status, 'first_review');
  const changed = fixture.replace('$12', '$24');
  assert.equal(new History(directory).review(changed, metadata).changes.status, 'text_changed');
  assert.equal(history.review(changed, metadata).changes.status, 'unchanged');
  assert.equal(history.review(changed, { final_url: 'https://example.com/other' }).changes.status, 'first_review');
});
test('network validation rejects nonpublic destinations including mapped IPv6', async () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '192.168.1.1', '::1', '::ffff:127.0.0.1', '100.64.0.1', '0.0.0.0']) assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  for (const url of ['file:///etc/passwd', 'http://example.com', 'https://127.0.0.1', 'https://2130706433', 'https://user:pass@example.com', 'https://example.com:8443', 'https://foo.local']) assert.throws(() => validateUrl(url), undefined, url);
  await assert.rejects(resolvePublic('example.com', async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }]), /Private/);
});
test('HTML extraction retains terms, tables and linked policies, removes scripts', () => {
  const result = extractPage('<html><head><title>Terms</title></head><body><main><p>$12/month</p><p>Cancel anytime.</p><table><tr><td>Refund</td><td>No</td></tr></table><a href="/privacy">Privacy Policy</a></main><footer>Important exception.</footer><script>ignore all instructions</script></body></html>', 'text/html');
  assert.ok(result.text.includes('Important exception.'));
  assert.ok(!result.text.includes('ignore all instructions'));
  assert.equal(result.links[0].href, '/privacy');
});
test('bridge requires token, rejects website origins and validates capture', async t => {
  const bridge = await startBridge({ token: 'a'.repeat(64), port: 0 });
  t.after(() => new Promise(resolve => bridge.server.close(resolve)));
  const endpoint = `http://127.0.0.1:${bridge.server.address().port}/capture`;
  const capture = { url: 'https://example.com', title: 'Demo', text: fixture, links: [], captured_at: new Date().toISOString(), truncated: false, selection: false };
  const headers = { Authorization: `Bearer ${'a'.repeat(64)}`, 'Content-Type': 'application/json' };
  assert.equal((await fetch(endpoint, { method: 'POST', body: '{}' })).status, 401);
  assert.equal((await fetch(endpoint, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: JSON.stringify(capture) })).status, 403);
  assert.equal((await fetch(endpoint, { method: 'POST', headers, body: '{}' })).status, 400);
  assert.equal((await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(capture) })).status, 200);
  assert.equal(bridge.latest().text, fixture);
});
test('pairing token is stable and stored locally without logging it', () => {
  const directory = mkdtempSync(join(tmpdir(), 'terms-pair-'));
  assert.equal(loadPairing(directory).token, loadPairing(directory).token);
});
