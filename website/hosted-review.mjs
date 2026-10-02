import { MAX_TERMS_LENGTH, splitTerms, validateReview } from './review-contract.mjs';

const form = document.getElementById('hosted-form');
const terms = document.getElementById('terms-input');
const keyField = document.getElementById('visitor-key');
const consent = document.getElementById('hosted-consent');
const submit = document.getElementById('review-submit');
const cancel = document.getElementById('review-cancel');
const clear = document.getElementById('review-clear');
const status = document.getElementById('hosted-status');
const results = document.getElementById('hosted-results');
const count = document.getElementById('terms-count');
let active;

function updateCount() { count.textContent = `${terms.value.length.toLocaleString()} / ${MAX_TERMS_LENGTH.toLocaleString()} characters`; }
function setBusy(busy) {
  submit.disabled = busy; cancel.hidden = !busy;
  form.setAttribute('aria-busy', String(busy));
}
function stop() { active?.abort(); active = undefined; setBusy(false); }
function erase() {
  stop(); keyField.value = ''; terms.value = ''; consent.checked = false;
  results.replaceChildren(); updateCount(); status.textContent = 'Terms, key and review cleared from this page.';
}
function element(tag, text, className) {
  const node = document.createElement(tag); node.textContent = text;
  if (className) node.className = className;
  return node;
}
function render(value, clauses) {
  results.replaceChildren(element('h3', 'Read the explanation with its sources'));
  results.append(element('p', `${clauses.length} of ${clauses.length} source segments returned with matching quotes. These checks do not establish that the explanations are correct. Check the full wording, especially exceptions and linked policies.`, 'small'));
  for (const [index, review] of value.reviews.entries()) {
    const article = document.createElement('article'); article.className = 'hosted-clause';
    article.append(element('h4', `[${review.id}]`), element('p', review.meaning));
    article.append(element('h5', 'Qualifications and exceptions'), element('p', review.qualifications));
    const quote = element('blockquote', review.quote); article.append(quote);
    const details = document.createElement('details');
    details.append(element('summary', `Read full source [${review.id}]`), element('p', clauses[index].text, 'original-terms'));
    article.append(details); results.append(article);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (active) return;
  let clauses;
  try { clauses = splitTerms(terms.value); }
  catch (error) { status.textContent = error.message; return; }
  if (!/^sk-[A-Za-z0-9_-]{16,512}$/.test(keyField.value.trim())) { status.textContent = 'Enter your own OpenAI API key.'; keyField.focus(); return; }
  if (!consent.checked) { status.textContent = 'Confirm the hosted review notice before sending.'; consent.focus(); return; }
  const text = terms.value;
  if (text.includes(keyField.value.trim())) { status.textContent = 'Keep the API key in its key field, not in the terms.'; return; }
  results.replaceChildren();
  const controller = new AbortController(); active = controller; setBusy(true);
  status.textContent = `Reviewing all ${clauses.length} source segments with GPT-5.4. This may take up to three minutes.`;
  try {
    const response = await fetch('/api/review/visitor', {
      method: 'POST', credentials: 'omit', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keyField.value.trim()}` },
      body: JSON.stringify({ text }),
    });
    const body = await response.json();
    if (!response.ok) throw Error(typeof body.error === 'string' ? body.error : 'The review failed. Try again.');
    const value = validateReview(body.value, clauses);
    if (active !== controller) return;
    render(value, clauses);
    status.textContent = terms.value === text ? 'Review ready. Inspect the original wording before deciding what to do.' : 'Review ready for the submitted text. Your edited draft is separate; submit it again to review those changes.';
  } catch (error) {
    if (active !== controller) return;
    status.textContent = controller.signal.aborted ? 'Review canceled. Your draft is unchanged.' : error.message || 'The review failed. Try again.';
  } finally { if (active === controller) { active = undefined; setBusy(false); } }
});
terms.addEventListener('input', updateCount);
cancel.addEventListener('click', () => { stop(); status.textContent = 'Review canceled. Your draft is unchanged. OpenAI may already have processed the request.'; });
clear.addEventListener('click', erase);
addEventListener('pagehide', erase);
// Clear browser-restored form values too, including a back/forward cache restore.
addEventListener('pageshow', event => { if (event.persisted) erase(); });
erase(); status.textContent = 'Nothing is sent until you submit a hosted review.';
