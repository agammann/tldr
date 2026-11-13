// Called only by the disposable GitHub-hosted Windows account test.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { prepareDataDirectory, protectEmptyDirectory } from '../src/private-state.mjs';

const parent = process.argv[2];
if (!parent || !/^C:\\tldr-acl-test-[a-f0-9]{32}$/i.test(parent)) throw new Error('Expected an isolated fixture path.');
mkdirSync(parent);
protectEmptyDirectory(parent);
execFileSync('icacls.exe', [parent, '/grant', '*S-1-5-11:(RX)'], { stdio: 'pipe', windowsHide: true });
writeFileSync(join(parent, 'control.txt'), 'synthetic public control');
execFileSync('icacls.exe', [join(parent, 'control.txt'), '/grant', '*S-1-5-11:(R)'], { stdio: 'pipe', windowsHide: true });
const state = prepareDataDirectory(join(parent, 'state'));
writeFileSync(join(state, 'pairing.json'), JSON.stringify({ endpoint: 'http://127.0.0.1:43187', token: 'a'.repeat(64) }));
prepareDataDirectory(state);
