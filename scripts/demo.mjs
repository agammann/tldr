import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const client = new Client({ name: 'terms-demo', version: '1.0.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../src/server.mjs', import.meta.url))], env: { ...process.env, TERMS_TLDR_DATA_DIR: mkdtempSync(join(tmpdir(), 'terms-demo-')) }, stderr: 'inherit' });
try {
  await client.connect(transport);
  const text = readFileSync(new URL('../examples/fictional-terms.txt', import.meta.url), 'utf8');
  const report = await client.callTool({ name: 'review_terms_text', arguments: { text, title: 'Fictional CloudNotebook' } });
  console.log(JSON.stringify(report.structuredContent, null, 2));
} finally { await client.close(); }
