import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPairing } from '../src/bridge.mjs';
import { History } from '../src/history.mjs';
import { defaultDataDirectory, prepareDataDirectory, protectEmptyDirectory } from '../src/private-state.mjs';

function fixture() {
  const parent = mkdtempSync(join(tmpdir(), 'tldr-private-'));
  protectEmptyDirectory(parent);
  return { parent, state: join(parent, 'state') };
}

function grant(sid, target, permission) {
  execFileSync('icacls.exe', [target, '/grant', `*${sid}:${permission}`], { stdio: 'pipe', windowsHide: true });
}

test('Windows defaults to per-user app data instead of the source checkout', { skip: process.platform !== 'win32' }, () => {
  assert.equal(defaultDataDirectory(), join(process.env.LOCALAPPDATA, 'TermsTLDR'));
});

test('Windows private state allows an ordinary review but rejects readable files and writable parents', { skip: process.platform !== 'win32' }, () => {
  const { parent, state } = fixture();
  try {
    assert.equal(prepareDataDirectory(state), state);
    const pairing = loadPairing(state);
    assert.match(pairing.token, /^[a-f0-9]{64}$/);
    new History(state).review('A fictional plan costs $12 monthly. Cancel anytime.', {
      final_url: 'https://example.invalid/terms', extraction: 'synthetic_text',
    });
    assert.doesNotThrow(() => prepareDataDirectory(state));
    assert.match(readFileSync(join(state, 'history.json'), 'utf8'), /fictional plan/);

    grant('S-1-5-11', join(state, 'pairing.json'), '(R)');
    assert.throws(() => prepareDataDirectory(state), /permissions are unsafe/);
    execFileSync('icacls.exe', [join(state, 'pairing.json'), '/remove', '*S-1-5-11'], { stdio: 'pipe', windowsHide: true });
    grant('S-1-5-11', join(state, 'history.json'), '(R)');
    assert.throws(() => prepareDataDirectory(state), /permissions are unsafe/);
  } finally { rmSync(parent, { recursive: true, force: true }); }

  const unsafe = fixture();
  try {
    grant('S-1-5-11', unsafe.parent, '(M)');
    assert.throws(() => prepareDataDirectory(unsafe.state), /permissions are unsafe/);
  } finally { rmSync(unsafe.parent, { recursive: true, force: true }); }
});
