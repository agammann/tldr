import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(process.env.TERMS_TEST_OUTPUT || join(root,'.local','live-check',String(Date.now())));
mkdirSync(out, {recursive:true});
const pages = [
 ['dropbox','https://www.dropbox.com/terms'],
 ['spotify','https://www.spotify.com/us/legal/end-user-agreement/'],
 ['github','https://docs.github.com/en/site-policy/github-terms/github-terms-of-service'],
 ['cloudflare','https://www.cloudflare.com/terms/'],
 ['mozilla','https://www.mozilla.org/en-US/about/legal/terms/firefox/'],
 ['mcp','https://modelcontextprotocol.io/registry/terms-of-service']
];
const client = new Client({name:'live-terms-verification',version:'1.0.0'});
const transport = new StdioClientTransport({command:process.execPath,args:[join(root,'src/server.mjs')],env:{...process.env,TERMS_TLDR_DATA_DIR:join(out,'state')},stderr:'inherit'});
const results=[];
try {
 await client.connect(transport);
 for (const [name,url] of pages) {
  const start=Date.now();
  const result=await client.callTool({name:'review_terms_url',arguments:{url}});
  const all=[...(result.structuredContent?.source_clauses || [])];
  let paging=result.structuredContent?.pagination;
  while(paging?.next_page) {
   const next=await client.callTool({name:'read_review_page',arguments:{review_id:paging.review_id,page:paging.next_page}});
   assert.ok(!next.isError);
   assert.equal(next.structuredContent.pagination.document_sha256,result.structuredContent.document.sha256);
   all.push(...next.structuredContent.source_clauses);paging=next.structuredContent.pagination;
  }
  if(!result.isError){ assert.equal(all.length,result.structuredContent.document.clause_count); assert.equal(new Set(all.map(c=>c.id)).size,all.length); }
  writeFileSync(join(out,`${name}.json`),JSON.stringify({...result,complete_source_clauses:all},null,2));
  const repeat=await client.callTool({name:'review_terms_url',arguments:{url}});
  const report={name,url,elapsed_ms:Date.now()-start,error:result.isError?result.content:undefined,characters:result.structuredContent?.document.character_count,clauses:all.length,pages:paging?.total_pages || 1,baseline:result.structuredContent?.changes.status,repeat:repeat.structuredContent?.changes.status};
  results.push(report);console.log(JSON.stringify(report));
 }
 assert.ok(results.every(r=>!r.error),'Every live page must produce a complete source review');
} finally {await client.close();writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));}
