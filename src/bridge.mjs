import http from 'node:http';
import { timingSafeEqual, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { MAX_TEXT } from './review.mjs';

export const captureSchema = z.object({
  url: z.string().url().max(2048).refine(v => /^https?:\/\//.test(v)),
  title: z.string().max(300), text: z.string().min(1).max(MAX_TEXT),
  links: z.array(z.object({ label: z.string().max(200), url: z.string().url().max(2048) })).max(40),
  captured_at: z.string().datetime(),
  truncated: z.boolean(),
  selection: z.boolean()
}).strict();

export function loadPairing(directory, port = 43187) {
  mkdirSync(directory, { recursive: true });
  const file = join(directory, 'pairing.json');
  try {
    const existing = JSON.parse(readFileSync(file, 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(existing.token) || existing.endpoint !== `http://127.0.0.1:${port}`) throw new Error('Invalid local pairing file.');
    return existing;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const pairing = { endpoint: `http://127.0.0.1:${port}`, token: randomBytes(32).toString('hex') };
  writeFileSync(file, JSON.stringify(pairing, null, 2), { mode: 0o600, flag: 'wx' });
  return pairing;
}

export async function startBridge({ token, port = 43187 }) {
  let latest = null;
  const server = http.createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const host = request.headers.host;
    if (host !== `127.0.0.1:${server.address().port}`) { response.writeHead(403).end(); return; }
    const origin = request.headers.origin;
    if (origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) { response.writeHead(403).end(); return; }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    }
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
    const expected = Buffer.from(`Bearer ${token}`);
    const supplied = Buffer.from(request.headers.authorization || '');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { response.writeHead(401).end(); return; }
    if (request.url !== '/capture' || request.method !== 'POST') { response.writeHead(404).end(); return; }
    if (!request.headers['content-type']?.startsWith('application/json')) { response.writeHead(415).end(); return; }
    let bytes = 0;
    const chunks = [];
    request.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 400000) { response.writeHead(413).end(); request.destroy(); }
      else chunks.push(chunk);
    });
    request.on('error', () => {});
    request.on('end', () => {
      if (bytes > 400000) return;
      try {
        const capture = captureSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        latest = { ...capture, received_at: new Date().toISOString() };
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ captured: true }));
      } catch { response.writeHead(400).end('Invalid page capture.'); }
    });
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.maxConnections = 10;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, latest: () => latest };
}
