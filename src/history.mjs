import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { reviewText } from './review.mjs';

export function compareTexts(before, after) {
  const oldReview = reviewText(before);
  const newReview = reviewText(after);
  if (oldReview.document.sha256 === newReview.document.sha256) return { status: 'unchanged', added: [], removed: [], interpretation: 'Extracted text is identical to the saved baseline.' };
  // Multiset comparison preserves repeated clauses. Movement alone is separately labeled.
  const difference = (a, b) => {
    const counts = new Map();
    for (const c of b) counts.set(c.text, (counts.get(c.text) || 0) + 1);
    return a.filter(c => { const count = counts.get(c.text) || 0; if (count) { counts.set(c.text, count - 1); return false; } return true; });
  };
  const added = difference(newReview.source_clauses, oldReview.source_clauses);
  const removed = difference(oldReview.source_clauses, newReview.source_clauses).map(c => ({ ...c, id: `OLD_${c.id}` }));
  return { status: added.length || removed.length ? 'text_changed' : 'order_or_format_changed', added, removed, interpretation: 'Text difference only. The assistant must explain material changes, preserving exceptions and context. This is not proof of when the provider changed its terms.' };
}

export class History {
  constructor(directory) { this.directory = directory; mkdirSync(directory, { recursive: true }); }
  review(text, metadata) {
    const report = reviewText(text, metadata);
    const url = new URL(metadata.final_url);
    url.hash = '';
    const key = createHash('sha256').update(url.href).digest('hex');
    const file = join(this.directory, 'history.json');
    let records = {};
    try { records = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw new Error('Saved history could not be read. Preserve it and repair the file before comparing.'); }
    const previous = records[key];
    report.changes = previous ? { ...compareTexts(previous.text, text), baseline_saved_at: previous.saved_at, baseline_url: previous.url } : { status: 'first_review', interpretation: 'No previous copy exists for this exact URL. This review creates the baseline; changes cannot yet be assessed.' };
    report.summary_instructions += ' Also explain important changes using changes.added and changes.removed. Cite removed clauses as [OLD_C0001] and current clauses as [C0001]. If first_review, clearly say there is no earlier copy to compare. Distinguish formatting changes from substantive commitments. Identify possible red flags with exact evidence and any mitigating exception; never invent a numerical safety score.';
    records[key] = { text, url: url.href, saved_at: new Date().toISOString() };
    // Keep at most 30 URL baselines. No raw URLs or titles are used as paths.
    records = Object.fromEntries(Object.entries(records).sort((a, b) => b[1].saved_at.localeCompare(a[1].saved_at)).slice(0, 30));
    const temporary = `${file}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify(records), { mode: 0o600 });
    renameSync(temporary, file);
    report.history = { storage: 'local_plaintext', retention: 'Latest baseline for up to 30 exact URLs', baseline_updated: true };
    return report;
  }
}
