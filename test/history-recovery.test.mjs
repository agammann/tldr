import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { History } from '../src/history.mjs';

test('malformed saved history stays intact and restoring the backup restores exact comparison', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tldr-history-recovery-'));
  try {
    const history = new History(directory), file = join(directory, 'history.json');
    const metadata = { final_url: 'https://example.com/terms', extraction: 'rendered_page_text' };
    const before = 'You pay $12 monthly.\n\nCancel at any time. Refunds are unavailable except where law requires them.';
    history.review(before, metadata);
    const backup = readFileSync(file);
    for (const invalid of ['{bad', 'null', '[]', '"edited"', '{"not-a-baseline":{"text":"edited"}}']) {
      writeFileSync(file, invalid);
      assert.throws(() => history.review(before.replace('$12', '$24'), metadata), /Saved history could not be read.*Preserve/);
      assert.equal(readFileSync(file, 'utf8'), invalid);
    }
    writeFileSync(file, backup);
    assert.equal(new History(directory).review(before, metadata).changes.status, 'unchanged');
    const changes = history.review(before.replace('$12', '$24'), metadata).changes;
    assert.deepEqual(changes.removed.map(c => c.text), ['You pay $12 monthly.']);
    assert.deepEqual(changes.added.map(c => c.text), ['You pay $24 monthly.']);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
