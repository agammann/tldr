import { randomUUID } from 'node:crypto';

// Bound each source page so long agreements do not disappear in host truncation.
export class ReviewPages {
  constructor() { this.reviews = new Map(); }
  prepare(report) {
    this.prune();
    const current = report.source_clauses || [];
    const previous = report.changes?.removed || [];
    if (JSON.stringify(report).length <= 28000) return report;
    const pages = [];
    let entries = [], size = 0;
    for (const entry of [...current.map(clause => ({ kind: 'current', ...clause })), ...previous.map(clause => ({ kind: 'previous', ...clause }))]) {
      const length = JSON.stringify(entry).length;
      if (size + length > 18000 && entries.length) { pages.push(entries); entries = []; size = 0; }
      entries.push(entry); size += length;
    }
    if (entries.length) pages.push(entries);
    const id = randomUUID();
    this.reviews.set(id, { pages, sha256: report.document.sha256, expires: Date.now() + 20 * 60 * 1000 });
    while (this.reviews.size > 8) this.reviews.delete(this.reviews.keys().next().value);
    const first = this.read(id, 1);
    const changes = report.changes && { ...report.changes, added_clause_ids: report.changes.added?.map(c => c.id), removed_clause_ids: previous.map(c => c.id), added: undefined, removed: undefined };
    return { ...report, changes, ...first,
      coverage: { ...report.coverage, all_extracted_text_included: pages.length === 1, all_extracted_text_available_via_pages: true },
      summary_instructions: `${report.summary_instructions} This review is paginated. Call read_review_page for EVERY remaining page before writing a complete TLDR or assessing important changes. If you cannot retrieve every page, explicitly label your answer partial. Previous clauses use OLD_ IDs. Paging reads an immutable snapshot and never advances history.`
    };
  }
  prune() { for (const [id, review] of this.reviews) if (review.expires <= Date.now()) this.reviews.delete(id); }
  read(id, page) {
    this.prune();
    const review = this.reviews.get(id);
    if (!review) throw new Error('Review expired or unavailable. Run the original review again and read all pages.');
    if (!Number.isInteger(page) || page < 1 || page > review.pages.length) throw new Error('Page is outside this review.');
    return {
      source_clauses: review.pages[page - 1].filter(c => c.kind === 'current').map(({kind, ...c}) => c),
      previous_clauses: review.pages[page - 1].filter(c => c.kind === 'previous').map(({kind, ...c}) => c),
      pagination: { review_id: id, page, total_pages: review.pages.length, next_page: page < review.pages.length ? page + 1 : null, document_sha256: review.sha256, expires_after_minutes: 20, read_tool: 'read_review_page' }
    };
  }
}
