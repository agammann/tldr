import test from 'node:test';
import assert from 'node:assert/strict';
import { startBridge, sharedBridge } from '../src/bridge.mjs';

test('MCP sessions share a capture without disk storage and recover after owner exit', async t => {
  const token = 'c'.repeat(64);
  const owner = await startBridge({ token, port: 0 });
  t.after(() => owner.server.close());
  const port = owner.server.address().port;
  const follower = sharedBridge({ token, port });
  t.after(() => follower.close());
  await follower.start();
  assert.equal(await follower.latest(), null);
  const endpoint = `http://127.0.0.1:${port}/capture`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const capture = { url: 'https://example.com/terms', title: 'Fictional', text: 'You pay $12 per month.', links: [], captured_at: new Date().toISOString(), truncated: false, selection: false };
  assert.equal((await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(capture) })).status, 200);
  assert.deepEqual(await follower.latest(), owner.latest());
  assert.equal((await fetch(endpoint)).status, 401);
  assert.equal((await fetch(endpoint, { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(endpoint, { headers: { ...headers, Origin: `chrome-extension://${'a'.repeat(32)}` } })).status, 404);
  const stranger = sharedBridge({ token: 'd'.repeat(64), port });
  t.after(() => stranger.close());
  await assert.rejects(stranger.latest(), /different pairing/);
  await new Promise(resolve => owner.server.close(resolve));
  assert.equal(await follower.latest(), null, 'Owner exit discards RAM capture; follower starts a new bridge');
  assert.equal((await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(capture) })).status, 200);
  assert.equal((await follower.latest()).text, capture.text);
});
