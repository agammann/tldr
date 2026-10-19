import { validatePairing } from './pairing.mjs';

export const BRIDGE_PROTOCOL = 'terms-tldr-bridge-v2';
export const MAX_ENVELOPE = 1700000;
const MAX_PLAINTEXT = 1200000;
// Reserve space for received_at and the authenticated latest-response wrapper.
export const MAX_CAPTURE_BYTES = MAX_PLAINTEXT - 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const upgrade = 'Capture failed (401). Check pairing and update both the MCP and extension to 1.0.1 or later, then reconnect every session.';
const hex = bytes => [...bytes].map(n => n.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g), part => Number.parseInt(part, 16));

function base64(bytes) {
  let text = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) text += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

async function key(token, direction) {
  if (!/^[a-f0-9]{64}$/.test(token) || !['request', 'response'].includes(direction)) throw new Error(upgrade);
  const material = await crypto.subtle.importKey('raw', unhex(token), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: encoder.encode(BRIDGE_PROTOCOL), info: encoder.encode(direction) }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function seal(token, direction, challenge, value) {
  if (!/^[a-f0-9]{64}$/.test(challenge)) throw new Error(upgrade);
  const bytes = encoder.encode(JSON.stringify(value));
  if (bytes.length > MAX_PLAINTEXT) throw new Error('Capture exceeds the encrypted bridge limit.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(`${BRIDGE_PROTOCOL}:${direction}:${challenge}`) }, await key(token, direction), bytes);
  return { protocol: BRIDGE_PROTOCOL, challenge, iv: hex(iv), ciphertext: base64(new Uint8Array(ciphertext)) };
}

export async function open(token, direction, challenge, envelope) {
  if (!envelope || Object.keys(envelope).sort().join(',') !== 'challenge,ciphertext,iv,protocol' || envelope.protocol !== BRIDGE_PROTOCOL || envelope.challenge !== challenge || !/^[a-f0-9]{64}$/.test(challenge) || !/^[a-f0-9]{24}$/.test(envelope.iv) || typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length > MAX_ENVELOPE || !/^[A-Za-z0-9_-]+$/.test(envelope.ciphertext)) throw new Error(upgrade);
  try {
    const ciphertext = Uint8Array.from(atob(envelope.ciphertext.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
    const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unhex(envelope.iv), additionalData: encoder.encode(`${BRIDGE_PROTOCOL}:${direction}:${challenge}`) }, await key(token, direction), ciphertext);
    if (bytes.byteLength > MAX_PLAINTEXT) throw new Error(upgrade);
    return JSON.parse(decoder.decode(bytes));
  } catch { throw new Error(upgrade); }
}

async function json(response, maximum) {
  if (!response.ok) { await response.body?.cancel(); throw new Error(upgrade); }
  const chunks = []; let size = 0;
  if (!response.body) throw new Error(upgrade);
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new Error(upgrade); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(decoder.decode(bytes));
}

export async function bridgeRequest(pairing, operation, capture, { fetchImpl = fetch } = {}) {
  const { token, endpoint } = validatePairing(pairing);
  if (!['capture', 'latest'].includes(operation)) throw new Error(upgrade);
  if (operation === 'capture' && encoder.encode(JSON.stringify(capture)).byteLength > MAX_CAPTURE_BYTES) throw new Error('Capture exceeds the encrypted bridge limit.');
  // Even a fake challenge only elicits ciphertext. The reusable token and page
  // never travel in headers or plaintext, including during local port takeover.
  const challenge = await json(await fetchImpl(`${endpoint}/challenge`, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000) }), 1024);
  if (challenge.protocol !== BRIDGE_PROTOCOL || !/^[a-f0-9]{64}$/.test(challenge.challenge)) throw new Error(upgrade);
  const request = await seal(token, 'request', challenge.challenge, { operation, ...(operation === 'capture' ? { capture } : {}) });
  const response = await json(await fetchImpl(`${endpoint}/bridge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), redirect: 'error', signal: AbortSignal.timeout(5000) }), MAX_ENVELOPE);
  const value = await open(token, 'response', challenge.challenge, response);
  if (!value || value.operation !== operation || value.requestIv !== request.iv) throw new Error(upgrade);
  return value.result;
}
