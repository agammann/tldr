import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';
import { parseHTML } from 'linkedom';
import { MAX_TEXT } from './review.mjs';

export const MAX_BYTES = 1024 * 1024;
export function isPublicAddress(address) {
  try { return ipaddr.process(address).range() === 'unicast'; } catch { return false; }
}
export function validateUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password) throw new Error('Only public HTTPS URLs on port 443 without credentials are supported.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostname.includes('.') || /(?:^|\.)(localhost|local|internal|test|invalid)$/i.test(hostname) || (isIP(hostname) && !isPublicAddress(hostname))) throw new Error('Private or reserved destinations are not allowed.');
  url.hash = '';
  return url;
}
export async function resolvePublic(hostname, resolver = lookup) {
  const records = await resolver(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(r => !isPublicAddress(r.address))) throw new Error('Private or reserved destinations are not allowed.');
  return records[0];
}

function requestOnce(url, address, signal) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      signal, agent: false,
      headers: { 'User-Agent': 'TermsTLDR/0.1', Accept: 'text/html,text/plain', 'Accept-Encoding': 'identity' },
      // Pin the validated DNS result. TLS still verifies the original hostname.
      lookup: (_hostname, options, callback) => options.all ? callback(null, [address]) : callback(null, address.address, address.family)
    }, response => {
      const status = response.statusCode ?? 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.resume();
        resolve({ redirect: response.headers.location });
        return;
      }
      if (status !== 200) { response.destroy(); reject(new Error(`Terms page returned HTTP ${status}. Paste the terms text instead.`)); return; }
      const type = (response.headers['content-type'] || '').toLowerCase();
      if (!/^(text\/html|text\/plain|application\/xhtml\+xml)(?:;|$)/.test(type)) { response.destroy(); reject(new Error('Only HTML and plain text pages are supported. Paste text from PDFs or other files.')); return; }
      if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') { response.destroy(); reject(new Error('Compressed responses are not supported. Paste the terms text.')); return; }
      if (Number(response.headers['content-length']) > MAX_BYTES) { response.destroy(); reject(new Error('Terms page exceeds the 1 MiB download limit.')); return; }
      let bytes = 0;
      const chunks = [];
      response.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) response.destroy(new Error('Terms page exceeds the 1 MiB download limit.'));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ body: Buffer.concat(chunks).toString('utf8'), type }));
    });
    request.on('error', reject);
  });
}

export function extractPage(body, type) {
  if (type.startsWith('text/plain')) return { text: body.trim(), title: '', links: [], extraction: 'plain_text' };
  const { document } = parseHTML(body);
  const title = document.querySelector('title')?.textContent?.trim().slice(0, 300) || '';
  for (const el of document.querySelectorAll('script,style,noscript,template')) el.remove();
  // Retain the whole body: guessing main/article can silently omit incorporated terms.
  const root = document.querySelector('body') || document.documentElement;
  const links = [...root.querySelectorAll('a[href]')].map(a => ({ label: a.textContent.trim().slice(0, 200), href: a.getAttribute('href').slice(0, 2000) }));
  for (const el of root.querySelectorAll('td,th')) el.appendChild(document.createTextNode(' '));
  for (const el of root.querySelectorAll('p,div,section,article,header,footer,nav,li,h1,h2,h3,h4,tr,br')) el.appendChild(document.createTextNode('\n\n'));
  const text = root.textContent.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text, title, links: links.slice(0, 100), links_omitted: Math.max(0, links.length - 100), extraction: 'static_html_body' };
}

export async function fetchTerms(value) {
  let url = validateUrl(value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const aborted = new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Terms fetch exceeded 15 seconds.')), { once: true }));
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const address = await Promise.race([resolvePublic(url.hostname.replace(/^\[|\]$/g, '')), aborted]);
      const result = await Promise.race([requestOnce(url, address, controller.signal), aborted]);
      if ('redirect' in result) {
        if (!result.redirect || redirects === 3) throw new Error('Missing redirect location or too many redirects.');
        url = validateUrl(new URL(result.redirect, url).href);
        continue;
      }
      const extracted = extractPage(result.body, result.type);
      if (extracted.text.length < 100) throw new Error('Too little readable text. This may require JavaScript or login; paste the terms text.');
      if (extracted.text.length > MAX_TEXT) throw new Error(`Extracted page exceeds ${MAX_TEXT} characters. Paste the relevant terms section with its scope stated.`);
      return { ...extracted, final_url: url.href, fetched_at: new Date().toISOString() };
    }
  } finally { clearTimeout(timer); }
}
