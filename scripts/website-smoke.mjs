import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import worker from '../website/dist/server/index.js';
import { splitTerms } from '../website/review-contract.mjs';

const output = new URL('../test-results/website/', import.meta.url);
await mkdir(output, { recursive: true });
const server = createServer(async (incoming, outgoing) => {
  try {
    const response = await worker.fetch(new Request(`http://127.0.0.1:${server.address().port}${incoming.url}`, {
      method: incoming.method, headers: incoming.headers,
      ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Readable.toWeb(incoming), duplex: 'half' } : {}),
    }));
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(500).end('Local verification server failed.'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const report = { method: 'Actual built website Worker and browser controls; controlled hosted responses, no model request.', checks: {}, errors: [], consoleErrors: [], layouts: [] };
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  await page.goto(base);
  assert.match(await page.title(), /tldr/i);
  await page.locator('h1').waitFor({ state: 'visible' });
  assert((await page.locator('h1').innerText()).trim());
  await page.locator('[data-view="changes"]').click();
  assert.match(await page.locator('#review-panel').innerText(), /price doubled/);
  await page.locator('#review-panel .cite').first().click();
  assert.equal(await page.locator('#C0002').evaluate(node => node.open), true);
  report.checks.exampleTabsAndExactSource = true;
  const draft = 'Your subscription costs $12 monthly.\n\nCancel at any time. Refunds are unavailable except where law requires them.';
  await page.locator('#terms-input').fill(draft);
  await page.locator('#hosted-form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.match(await page.locator('#hosted-status').innerText(), /own OpenAI API key/);
  await page.locator('#visitor-key').fill('sk-fictional-browser-verification');
  await page.locator('#hosted-form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.match(await page.locator('#hosted-status').innerText(), /Confirm.*notice/);
  report.checks.noRequestBeforeKeyAndConsent = true;
  await page.locator('#hosted-consent').check();
  let requests = 0, behavior = 'stall', release, captured;
  const firstRequest = new Promise(resolve => { captured = resolve; });
  await page.route(base + '/api/review/visitor', async route => {
    requests++;
    assert.equal(route.request().method(), 'POST');
    const text = route.request().postDataJSON().text, clauses = splitTerms(text);
    if (behavior === 'stall') { await new Promise(resolve => { release = resolve; captured(); }); }
    const value = { reviews: clauses.map(clause => ({ id: clause.id, meaning: 'Fictional explanation for the submitted source.', qualifications: 'Inspect the original exceptions.', quote: clause.text.trim() })) };
    if (behavior === 'invalid') value.reviews[0].quote = 'Unsupported invented quotation.';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value }) }).catch(() => {});
  });
  await page.locator('#review-submit').click();
  await firstRequest;
  await page.locator('#review-cancel').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#hosted-form').getAttribute('aria-busy') === 'true');
  await page.locator('#review-cancel').click();
  assert.equal(await page.locator('#terms-input').inputValue(), draft);
  assert.match(await page.locator('#hosted-status').innerText(), /canceled/);
  release?.();
  assert.equal(await page.locator('#hosted-results').innerText(), '');
  report.checks.cancelPreservesDraftAndAcceptsNoReview = true;
  behavior = 'valid';
  await page.locator('#review-submit').click();
  await page.getByText('Review ready. Inspect the original wording before deciding what to do.', { exact: true }).waitFor();
  assert.equal(await page.locator('.hosted-clause').count(), 2);
  assert.deepEqual(await page.locator('.hosted-clause blockquote').allTextContents(), splitTerms(draft).map(clause => clause.text.trim()));
  report.checks.completeExactQuotesRendered = true;
  behavior = 'invalid';
  await page.locator('#review-submit').click();
  await page.waitForFunction(() => document.querySelector('#hosted-form').getAttribute('aria-busy') === 'false');
  assert.match(await page.locator('#hosted-status').innerText(), /invalid source references/);
  assert.equal(await page.locator('#hosted-results').innerText(), '');
  report.checks.badQuotesRejected = true;
  await page.locator('#review-clear').click();
  assert.equal(await page.locator('#terms-input').inputValue(), '');
  assert.equal(await page.locator('#visitor-key').inputValue(), '');
  assert.equal(await page.locator('#hosted-consent').isChecked(), false);
  await page.locator('#visitor-key').fill('sk-fictional-browser-verification');
  await page.locator('#terms-input').fill(draft);
  await page.reload();
  assert.equal(await page.locator('#visitor-key').inputValue(), '');
  assert.equal(await page.locator('#terms-input').inputValue(), '');
  report.checks.clearAndReloadEraseKeyAndText = true;
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert(layout.scrollWidth <= width); report.layouts.push(layout);
    await page.screenshot({ path: fileURLToPath(new URL(`website-${width}.png`, output)), fullPage: true, animations: 'disabled' });
  }
  assert.deepEqual(report.errors, []); assert.deepEqual(report.consoleErrors, []);
  report.checks.privateFakeKeyNeverStored = await page.evaluate(() => !JSON.stringify({ ...localStorage, ...sessionStorage }).includes('sk-fictional'));
  assert(report.checks.privateFakeKeyNeverStored);
  report.requests = requests; report.outcome = 'pass';
} catch (error) { report.outcome = 'failure'; report.failure = error.message; process.exitCode = 1; }
finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
