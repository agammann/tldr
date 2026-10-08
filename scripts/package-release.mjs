import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const git = args => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
if (resolve(git(['rev-parse', '--show-toplevel'])) !== process.cwd() || git(['status', '--porcelain', '--untracked-files=normal'])) throw Error('Package a clean committed tree from its repository root.');
const metadata = JSON.parse(readFileSync('package.json', 'utf8'));
const extension = JSON.parse(readFileSync('extension/manifest.json', 'utf8'));
const version = metadata.version, commit = git(['rev-parse', 'HEAD']);
if (metadata.name !== 'tldr-mcp' || metadata.license !== 'MIT' || extension.version !== version || !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(version)) throw Error('Expected matching stable service and extension versions with MIT metadata.');
if (process.env.GITHUB_SHA && process.env.GITHUB_SHA !== commit) throw Error('Checkout differs from the checked workflow commit.');
const directory = resolve('release-artifacts'); mkdirSync(directory, { recursive: true });
const lines = [];
for (const kind of ['source', 'extension']) {
  const name = `tldr_${version}_${kind}.zip`;
  const files = kind === 'extension' ? ['extension/', 'LICENSE', 'THIRD_PARTY_NOTICES.md'] : [];
  execFileSync('git', ['archive', '--format=zip', `--prefix=tldr-${kind === 'source' ? '' : 'extension-'}${version}/`, `--output=${resolve(directory, name)}`, 'HEAD', ...files], { windowsHide: true });
  const checksum = createHash('sha256').update(readFileSync(resolve(directory, name))).digest('hex') + '  ' + name + '\n';
  writeFileSync(resolve(directory, name + '.sha256'), checksum); lines.push(checksum);
}
writeFileSync(resolve(directory, 'SHA256SUMS'), lines.join(''));
console.log(`Packaged matching tldr ${version} service source and extension from ${commit}`);
