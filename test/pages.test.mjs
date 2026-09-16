import test from 'node:test';
import assert from 'node:assert/strict';
import { ReviewPages } from '../src/pages.mjs';
import { reviewText } from '../src/review.mjs';
import { compareTexts, History } from '../src/history.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('long agreements and removed clauses can be read completely without duplicates', () => {
  const before=Array.from({length:100},(_,i)=>`Section ${i}: ${'Previously allowed use. '.repeat(20)}`).join('\n\n');
  const after=before.replaceAll('Previously allowed use.', 'Now prohibited use.');
  const source=reviewText(after);
  const changes=compareTexts(before,after);
  const store=new ReviewPages();
  const first=store.prepare({...source,changes});
  assert.ok(first.pagination.total_pages > 2);
  assert.equal(first.coverage.all_extracted_text_included,false);
  const current=[...first.source_clauses], previous=[...first.previous_clauses];
  for(let page=2;page<=first.pagination.total_pages;page++) {
    const next=store.read(first.pagination.review_id,page);
    assert.ok(JSON.stringify(next).length<21000);
    current.push(...next.source_clauses); previous.push(...next.previous_clauses);
  }
  assert.deepEqual(current,source.source_clauses);
  assert.deepEqual(previous,changes.removed);
  assert.deepEqual(first.changes.added_clause_ids,changes.added.map(c=>c.id));
  assert.throws(()=>store.read(first.pagination.review_id,1000),/outside/);
  store.reviews.get(first.pagination.review_id).expires=0;
  assert.throws(()=>store.read(first.pagination.review_id,1),/expired/);
});

test('changing capture method does not report false changes to provider terms', () => {
  const history=new History(mkdtempSync(join(tmpdir(),'terms-method-')));
  history.review('Annual plan. Cancel anytime.',{final_url:'https://example.com/terms',extraction:'static_html_body'});
  const browser=history.review('Annual plan.\nCancel anytime.',{final_url:'https://example.com/terms',extraction:'rendered_page_text'});
  assert.equal(browser.changes.status,'capture_method_changed');
});

test('CRLF input preserves clauses and is equivalent to LF for comparison', () => {
  const old='Cancel anytime.\r\n\r\nRefunds subject to law.';
  const updated='Cancel anytime.\n\nRefunds subject to law.';
  assert.deepEqual(reviewText(old).source_clauses,reviewText(updated).source_clauses);
  assert.equal(compareTexts(old,updated).status,'unchanged');
});
