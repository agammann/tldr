import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
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

function diagnosticAcl(target) {
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try {
    return execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-Command',
      'Get-Acl -LiteralPath $env:TLDR_TEST_ACL_PATH | Select-Object Owner,AccessToString | ConvertTo-Json -Compress'],
    { env: { ...process.env, TLDR_TEST_ACL_PATH: target }, stdio: 'pipe', windowsHide: true }).toString().trim();
  } catch { return 'ACL unavailable'; }
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
    try { assert.doesNotThrow(() => prepareDataDirectory(state)); }
    catch (error) {
      for (const name of ['state', 'pairing.json', 'history.json']) {
        console.error(`Synthetic ${name} ACL: ${diagnosticAcl(name === 'state' ? state : join(state, name))}`);
      }
      throw error;
    }
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

test('Windows refuses an existing unsafe empty store and replaceable or linked ancestors', { skip: process.platform !== 'win32' }, () => {
  const { parent, state } = fixture();
  try {
    mkdirSync(state);
    grant('S-1-5-11', state, '(M)');
    assert.throws(() => prepareDataDirectory(state), /permissions are unsafe/);
  } finally { rmSync(parent, { recursive: true, force: true }); }

  const unsafe = fixture();
  try {
    const intermediate = join(unsafe.parent, 'intermediate');
    mkdirSync(intermediate);
    grant('S-1-5-11', unsafe.parent, '(DC)');
    assert.throws(() => prepareDataDirectory(join(intermediate, 'state')), /permissions are unsafe/);
  } finally { rmSync(unsafe.parent, { recursive: true, force: true }); }

  const linked = fixture();
  try {
    const target = join(linked.parent, 'target');
    mkdirSync(target);
    symlinkSync(target, join(linked.parent, 'link'), 'junction');
    mkdirSync(join(linked.parent, 'link', 'intermediate'));
    assert.throws(() => prepareDataDirectory(join(linked.parent, 'link', 'intermediate', 'state')), /permissions are unsafe/);
  } finally { rmSync(linked.parent, { recursive: true, force: true }); }
});
