import { REVIEW_MODEL, splitTerms, reviewInstructions, reviewSchema, validateReview } from './review-contract.mjs';

class ReviewError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
async function readLimited(message, limit, signal) {
  const reader = message.body?.getReader();
  if (!reader) throw new ReviewError('The request or response was empty.');
  const chunks = []; let size = 0;
  const stop = () => { reader.cancel(signal.reason).catch(() => {}); };
  signal.addEventListener('abort', stop, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new ReviewError('The request or response exceeds the review limit.', 413);
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } finally { signal.removeEventListener('abort', stop); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
const reviewJson = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
function statusError(status) {
  if (status === 401) return new ReviewError('OpenAI rejected this key. Check your API key and try again.', 401);
  if (status === 403 || status === 404) return new ReviewError('This key cannot access GPT-5.4. Check its model permissions.', 403);
  if (status === 429) return new ReviewError('OpenAI reported a usage or rate limit. Check your API billing and limits.', 429);
  return new ReviewError('OpenAI could not complete the review. Try again later.', 502);
}

// No owner credential, automatic retry, URL fetching, or provider redirect.
export async function visitorReview(request, { fetchImpl = fetch } = {}) {
  let signal;
  try {
    if (request.method !== 'POST') throw new ReviewError('Method not allowed.', 405);
    if (request.headers.get('Origin') !== new URL(request.url).origin) throw new ReviewError('Open tldr to submit a review.', 403);
    const key = /^Bearer (sk-[A-Za-z0-9_-]{16,512})$/.exec(request.headers.get('Authorization') || '')?.[1];
    if (!key) throw new ReviewError('Enter your own OpenAI API key.', 401);
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) throw new ReviewError('Send terms as JSON.');
    signal = AbortSignal.any([request.signal, AbortSignal.timeout(180000)]);
    const raw = await readLimited(request, 128 * 1024, signal);
    let data;
    try { data = JSON.parse(raw); } catch { throw new ReviewError('Send valid JSON terms.'); }
    let clauses;
    try { clauses = splitTerms(data?.text); } catch (error) { throw new ReviewError(error.message); }
    if (raw.includes(key) || data.text.includes(key)) throw new ReviewError('Keep the API key in its key field, not in the terms.');
    signal.throwIfAborted();
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST', redirect: 'manual', signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: REVIEW_MODEL, store: false, max_output_tokens: 18000, reasoning: { effort: 'medium' },
        instructions: reviewInstructions, input: JSON.stringify({ clauses }),
        text: { format: { type: 'json_schema', name: 'tldr_clause_review', strict: true, schema: reviewSchema(clauses) } },
      }),
    });
    if (!response.ok) { await response.body?.cancel(); throw statusError(response.status); }
    let completion;
    try { completion = JSON.parse(await readLimited(response, 1024 * 1024, signal)); }
    catch { throw new ReviewError('OpenAI returned an unreadable review. Nothing was accepted.', 502); }
    signal.throwIfAborted();
    if (completion.status !== 'completed') throw new ReviewError('The review did not finish. Nothing was accepted. Try again.', 502);
    const content = (completion.output || []).flatMap(item => item.type === 'message' ? item.content || [] : []);
    if (content.some(part => part.type === 'refusal')) throw new ReviewError('The model could not review this text.', 422);
    const output = content.filter(part => part.type === 'output_text').map(part => part.text).join('');
    if (!output || output.includes(key)) throw new ReviewError('The review could not be returned safely.', 502);
    let value;
    try { value = validateReview(JSON.parse(output), clauses); }
    catch { throw new ReviewError('The review failed source coverage or quotation checks. Nothing was accepted. Try again.', 502); }
    if (JSON.stringify(value).includes(key)) throw new ReviewError('The review could not be returned safely.', 502);
    return reviewJson({ value, model: REVIEW_MODEL });
  } catch (error) {
    if (request.signal.aborted) return reviewJson({ error: 'Review canceled.' }, 499);
    if (signal?.aborted) return reviewJson({ error: 'The review timed out. Nothing was accepted. Try again.' }, 504);
    return reviewJson({ error: error instanceof ReviewError ? error.message : 'The review could not be completed. Nothing was accepted. Try again.' }, error instanceof ReviewError ? error.status : 502);
  }
}
