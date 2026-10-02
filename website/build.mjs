import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
const files = ['index.html', 'styles.css', 'app.js', 'hosted-review.mjs', 'review-contract.mjs'];
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };
const assets = Object.fromEntries(files.map(file => [file === 'index.html' ? '/' : '/' + file, { type: types[path.extname(file)], data: Buffer.from(read(file)).toString('base64') }]));
// These two dependency-free modules form the Worker. Keep the import explicit so
// adding a new dependency fails the build instead of silently omitting it.
const contract = read('review-contract.mjs').replace(/^export /gm, '');
const route = read('visitor-review.mjs');
const expectedImport = "import { REVIEW_MODEL, splitTerms, reviewInstructions, reviewSchema, validateReview } from './review-contract.mjs';";
if (!route.startsWith(expectedImport) || /^import /m.test(route.slice(expectedImport.length)) || /^import /m.test(contract)) throw Error('Update the website build for its module imports.');
const worker = `${contract}\n${route.slice(expectedImport.length).replace(/^export /gm, '')}\nconst assets = ${JSON.stringify(assets)};
export default { async fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === '/api/review/visitor') return visitorReview(request);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed.', { status: 405 });
  const asset = assets[path === '/index.html' ? '/' : path];
  if (!asset) return new Response('Not found.', { status: 404 });
  return new Response(request.method === 'HEAD' ? null : Uint8Array.from(atob(asset.data), c => c.charCodeAt(0)), {
    headers: { 'Content-Type': asset.type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
  });
} };\n`;
mkdirSync(path.join(root, 'dist/server'), { recursive: true });
mkdirSync(path.join(root, 'dist/.openai'), { recursive: true });
writeFileSync(path.join(root, 'dist/server/index.js'), worker);
writeFileSync(path.join(root, 'dist/.openai/hosting.json'), read('.openai/hosting.json'));
console.log('Built tldr website Worker and five public assets.');
