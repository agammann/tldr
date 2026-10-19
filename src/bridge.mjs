import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { MAX_TEXT } from './review.mjs';
import { BRIDGE_PROTOCOL, MAX_ENVELOPE, MAX_CAPTURE_BYTES, bridgeRequest, open, seal } from '../extension/bridge-protocol.mjs';

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
  try { writeFileSync(file, JSON.stringify(pairing, null, 2), { mode: 0o600, flag: 'wx' }); }
  catch (error) { if (error.code === 'EEXIST') return loadPairing(directory, port); throw error; }
  return pairing;
}

export async function startBridge({ token, port = 43187 }) {
  let latest = null;
  const challenges = new Map();
  async function handle(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Connection', 'close');
    const host = request.headers.host;
    if (host !== `127.0.0.1:${server.address().port}`) { response.writeHead(403).end(); return; }
    const origin = request.headers.origin;
    if (origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) { response.writeHead(403).end(); return; }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
    // Plaintext v1 clients must upgrade; no raw bearer route remains.
    if (request.headers.authorization || request.url === '/capture') { response.writeHead(401).end(); return; }
    if (request.url === '/challenge' && request.method === 'GET') {
      const now = Date.now();
      for (const [nonce, expires] of challenges) if (expires <= now) challenges.delete(nonce);
      if (challenges.size >= 256) { response.writeHead(429).end(); return; }
      const challenge = randomBytes(32).toString('hex');
      challenges.set(challenge, now + 10000);
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ protocol: BRIDGE_PROTOCOL, challenge }));
      return;
    }
    if (request.url !== '/bridge' || request.method !== 'POST') { response.writeHead(404).end(); return; }
    if (!request.headers['content-type']?.startsWith('application/json')) { response.writeHead(415).end(); return; }
    let bytes = 0;
    const chunks = [];
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > MAX_ENVELOPE) { response.writeHead(413).end(); request.destroy(); return; }
      chunks.push(chunk);
    }
    const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const expires = challenges.get(envelope?.challenge);
    challenges.delete(envelope?.challenge); // One use, including failed authentication.
    if (!expires || expires <= Date.now()) { response.writeHead(401).end(); return; }
    let payload;
    try { payload = await open(token, 'request', envelope.challenge, envelope); }
    catch { response.writeHead(401).end(); return; }
    let result;
    if (payload?.operation === 'capture' && Object.keys(payload).sort().join(',') === 'capture,operation') {
        const capture = captureSchema.parse(payload.capture);
        if (Buffer.byteLength(JSON.stringify(capture), 'utf8') > MAX_CAPTURE_BYTES) { response.writeHead(413).end(); return; }
        latest = { ...capture, received_at: new Date().toISOString() };
        result = { captured: true };
    } else if (payload?.operation === 'latest' && Object.keys(payload).join(',') === 'operation' && !origin) {
        result = { capture: latest };
    } else { response.writeHead(400).end(); return; }
    const encrypted = await seal(token, 'response', envelope.challenge, { operation: payload.operation, requestIv: envelope.iv, result });
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(encrypted));
  }
  const server = http.createServer((request, response) => {
    void handle(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(400);
      response.end('Invalid encrypted bridge request.');
    });
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.maxConnections = 10;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, latest: () => latest };
}

export function sharedBridge({ token, port = 43187 }) {
  let owned;
  let pending;
  let closed = false;
  const ensureOwner = async () => {
    if (owned || closed) return;
    if (!pending) pending = startBridge({ token, port }).then(value => {
      if (closed) value.server.close(); else owned = value;
    }).catch(error => { if (error.code !== 'EADDRINUSE') throw error; }).finally(() => { pending = undefined; });
    await pending;
  };
  return {
    start: ensureOwner,
    async latest() {
      await ensureOwner();
      if (closed) throw new Error('Browser bridge is closed.');
      if (owned) return owned.latest();
      const value = await bridgeRequest({ token, endpoint: `http://127.0.0.1:${port}` }, 'latest');
      return value.capture === null ? null : captureSchema.extend({ received_at: z.string().datetime() }).parse(value.capture);
    },
    async close() { closed = true; await pending; if (owned) await new Promise(resolve => owned.server.close(resolve)); }
  };
}
