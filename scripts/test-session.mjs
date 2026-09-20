import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startBridge } from '../src/bridge.mjs';

export async function isolatedSession() {
  const directory = mkdtempSync(join(tmpdir(), 'tldr-check-'));
  // Reserve a free port, then let the child MCP own it. A conflicting process
  // fails authentication instead of receiving test captures.
  const reservation = await startBridge({ token: '0'.repeat(64), port: 0 });
  const port = reservation.server.address().port;
  await new Promise(resolve => reservation.server.close(resolve));
  return { directory, env: { ...process.env, TLDR_DATA_DIR: directory, TLDR_BRIDGE_PORT: String(port), TERMS_TLDR_DATA_DIR: directory, TERMS_TLDR_BRIDGE_PORT: String(port) } };
}
