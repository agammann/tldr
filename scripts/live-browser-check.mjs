import { chromium } from 'playwright';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'terms-browser-'));
const client = new Client({ name: 'real-browser-test', version: '1.0.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: [join(root, 'src/server.mjs')], env: { ...process.env, TERMS_TLDR_DATA_DIR: directory }, stderr: 'inherit' });
let context;
try {
  await client.connect(transport);
  const executablePath = process.env.BROWSER_EXECUTABLE || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined);
  context = await chromium.launchPersistentContext(join(directory, 'browser'), { executablePath, headless: true, ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging'] });
  const browserCdp = await context.browser().newBrowserCDPSession();
  const { id } = await browserCdp.send('Extensions.loadUnpacked', { path: join(root, 'extension') });
  assert.match(id, /^[a-p]{32}$/);
  const target = await context.newPage();
  await target.goto('https://www.dropbox.com/terms', {waitUntil:'domcontentloaded'});
  await target.getByText('Dropbox Terms of Service', {exact:true}).waitFor();
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.locator('summary').click();
  await popup.locator('#pair').setInputFiles(join(directory, 'pairing.json'));
  await popup.getByText('Connected settings saved.', { exact: false }).waitFor();
  await target.bringToFront();
  await popup.locator('#capture').click();
  await popup.locator('#capture:not([disabled])').waitFor();
  assert.match(await popup.locator('#status').innerText(), /regular website|Cannot access|permission/i, 'Public page capture requires an extension action grant');
  const cdp = await context.newCDPSession(target);
  const {targetInfo} = await cdp.send('Target.getTargetInfo');
  const {targetInfos} = await browserCdp.send('Target.getTargets', {filter:[{type:'tab',exclude:false}]});
  const browserTab = targetInfos.find(t => t.url === targetInfo.url);
  assert.ok(browserTab, 'Public website has a browser tab target');
  await browserCdp.send('Extensions.triggerAction', {id, targetId:browserTab.targetId});
  await popup.locator('#capture').click();
  await popup.getByText('Page captured.', { exact: false }).waitFor({ timeout: 10000 });
  const result = await client.callTool({ name: 'review_current_page', arguments: {} });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.changes.status, 'first_review');
  assert.equal(result.structuredContent.document.final_url,'https://www.dropbox.com/terms');
  assert.ok(result.structuredContent.browser_context.candidate_policy_links.some(c => c.url.includes('/privacy')));
  const results=[];
  async function complete(report) {
    let paging=report.pagination;
    const clauses=[...report.source_clauses];
    while(paging?.next_page){const next=await client.callTool({name:'read_review_page',arguments:{review_id:paging.review_id,page:paging.next_page}}); assert.ok(!next.isError);clauses.push(...next.structuredContent.source_clauses);paging=next.structuredContent.pagination;}
    assert.equal(clauses.length,report.document.clause_count);
    results.push({url:report.document.final_url,characters:report.document.character_count,clauses:clauses.length,pages:paging?.total_pages||1,truncated:report.document.input_truncated});
  }
  await complete(result.structuredContent);
  for(const url of ['https://www.spotify.com/us/legal/end-user-agreement/','https://docs.github.com/en/site-policy/github-terms/github-terms-of-service']) {
    await target.goto(url,{waitUntil:'domcontentloaded'});
    await target.locator('h1').first().waitFor();
    await target.bringToFront();
    await browserCdp.send('Extensions.triggerAction',{id,targetId:browserTab.targetId});
    await popup.locator('#capture').click();
    await popup.locator('#capture:not([disabled])').waitFor();
    assert.match(await popup.locator('#status').innerText(),/Page captured/);
    const report=await client.callTool({name:'review_current_page',arguments:{}});
    assert.ok(!report.isError);
    assert.equal(report.structuredContent.document.final_url,url);
    assert.equal(report.structuredContent.document.input_truncated,false);
    await complete(report.structuredContent);
  }
  mkdirSync(join(root,'.local'),{recursive:true});
  const browserVersion = context.browser().version();
  writeFileSync(join(root,'.local','live-browser-results.json'),JSON.stringify({browser_version:browserVersion,executable:executablePath,permission_denied_before_action:true,real_action_grants_access:true,results},null,2));
  await popup.setViewportSize({ width: 350, height: 730 });
  console.log(JSON.stringify({browser_version:browserVersion,permission_denied_before_action:true,real_action_grants_access:true,results}));
} finally { await context?.close(); await client.close(); }
