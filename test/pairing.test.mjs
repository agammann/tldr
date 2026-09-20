import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePairing } from '../extension/pairing.mjs';

test('extension accepts default and isolated loopback ports without widening host access', () => {
  const token = 'a'.repeat(64);
  for (const port of [43187, 54321, 65535]) {
    const value = { endpoint: `http://127.0.0.1:${port}`, token };
    assert.deepEqual(validatePairing(value), value);
  }
  for (const endpoint of ['https://127.0.0.1:43187', 'http://localhost:43187', 'http://127.0.0.1:0', 'http://127.0.0.1:65536', 'http://127.0.0.1:43187/', 'http://127.0.0.1:43187@evil.example', 'http://evil.example:43187', 'http://127.0.0.1:43187?x=1']) {
    assert.throws(() => validatePairing({ endpoint, token }), /valid pairing/);
  }
  for (const value of [null, {}, { endpoint: 'http://127.0.0.1:43187', token: 'bad' }]) assert.throws(() => validatePairing(value), /valid pairing/);
});
