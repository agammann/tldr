import argparse,hashlib,json,stat,subprocess,zipfile
from pathlib import Path,PurePosixPath
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);parser.add_argument('--artifacts');args=parser.parse_args()
artifacts=Path(args.artifacts).resolve() if args.artifacts else ROOT/'release-artifacts'
version=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')[:-1]
destination=Path(args.out).resolve()
if destination.exists() or destination.is_relative_to(ROOT):raise ValueError('Extract into a new folder outside the checkout')
lines=[];extracted={}
for kind in ['source','extension']:
 name=f'tldr_{version}_{kind}.zip';archive=artifacts/name
 checksum=hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+name+'\n';lines.append(checksum)
 if (artifacts/(name+'.sha256')).read_text(encoding='utf-8')!=checksum:raise ValueError('Checksum mismatch')
 prefix=f"tldr-{'extension-' if kind=='extension' else ''}{version}/"
 with zipfile.ZipFile(archive) as z:
  if z.testzip() is not None or len(z.namelist())!=len(set(z.namelist())) or z.comment.decode()!=commit:raise ValueError('ZIP CRC, duplicates or commit mismatch')
  files={}
  for entry in z.infolist():
   if not entry.filename.startswith(prefix):raise ValueError('Archive prefix mismatch')
   name=entry.filename[len(prefix):];path=PurePosixPath(name)
   if path.is_absolute() or '..' in path.parts or '\\' in name or ':' in name:raise ValueError('Unsafe archive path')
   if any(part in {'.git','node_modules','.local','dist','reports','test-results','release-artifacts'} or part.startswith('.env') for part in path.parts):raise ValueError('Private or build entry')
   if stat.S_IFMT(entry.external_attr>>16) not in {0,stat.S_IFREG,stat.S_IFDIR}:raise ValueError('Special archive entry')
   if not entry.is_dir():files[name]=z.read(entry)
  expected=set(tracked) if kind=='source' else {p for p in tracked if p.startswith('extension/') or p in {'LICENSE','THIRD_PARTY_NOTICES.md'}}
  if set(files)!=expected:raise ValueError('Archive inventory mismatch')
  for name,b in files.items():
   expected=subprocess.check_output(['git','show',f'HEAD:{name}'],cwd=ROOT)
   if b!=expected:raise ValueError('Archive source mismatch '+name)
  if json.loads(files['extension/manifest.json'])['version']!=version or 'LICENSE' not in files or 'THIRD_PARTY_NOTICES.md' not in files:raise ValueError('Extension version or notices mismatch')
  extracted[kind]=files
if (artifacts/'SHA256SUMS').read_text(encoding='utf-8')!=''.join(lines):raise ValueError('Combined checksums mismatch')
destination.mkdir(parents=True)
for kind,files in extracted.items():
 target=destination/kind;target.mkdir()
 for name,b in files.items():
  out=target/name;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(b)
print(json.dumps({'version':version,'commit':commit,'sourceFiles':len(extracted['source']),'extensionFiles':len(extracted['extension']),'sourceBytes':'exact','consumer':str(destination)}))
