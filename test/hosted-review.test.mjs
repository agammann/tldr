import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTerms, validateReview, REVIEW_MODEL } from '../website/review-contract.mjs';
import { visitorReview } from '../website/visitor-review.mjs';

const key = 'sk-fictional-verification-placeholder';
const text = 'Renewal costs $12 per month. Cancel 24 hours before billing.\n\nFees are nonrefundable, except where a refund is required by law.';
const clauses = splitTerms(text);
const review = () => ({ reviews: clauses.map(clause => ({ id: clause.id, meaning: 'A fictional explanation.', qualifications: 'Read the full exceptions.', quote: clause.text.trim() })) });
const request = (value = { text }, headers = {}, signal) => new Request('https://example.test/api/review/visitor', {
  method: 'POST', signal,
  headers: { Origin: 'https://example.test', Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(value),
});
const completion = value => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });

test('segmentation retains every input character, including whitespace, long paragraphs and Unicode', () => {
  for (const input of [text, '\n\n  First.\r\n\r\nSecond.\n  ', 'abc😀 '.repeat(1800), 'x'.repeat(11999), 'Clause one.\n\n'.repeat(24)]) {
    const parts = splitTerms(input);
    assert.equal(parts.map(clause => clause.text).join(''), input);
    assert.ok(parts.every(clause => clause.text.trim()));
    assert.equal(new Set(parts.map(clause => clause.id)).size, parts.length);
  }
  assert.throws(() => splitTerms('x'.repeat(12001)), /12,000/);
  assert.throws(() => splitTerms('Clause.\n\n'.repeat(25)), /24/);
  assert.throws(() => splitTerms(' \n'), /Paste/);
});

test('coverage and exact quotes fail closed on omissions, duplicate IDs, reordering and invented references', () => {
  assert.deepEqual(validateReview(review(), clauses), review());
  for (const mutate of [value => value.reviews.pop(), value => value.reviews.reverse(), value => value.reviews[1].id = 'C0001', value => value.reviews[0].quote = '$6 per month', value => value.reviews[0].qualifications = 'See C9999', value => value.reviews[0].qualifications = 'See C99999']) {
    const value = review(); mutate(value);
    assert.throws(() => validateReview(value, clauses));
  }
});

test('the route sends all clauses to a fixed model/provider with only the visitor key and storage disabled', async () => {
  let calls = 0;
  const response = await visitorReview(request({ text, model: 'untrusted', endpoint: 'https://elsewhere.test', ignored: 'not sent' }), { fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.redirect, 'manual'); assert.equal(options.headers.Authorization, `Bearer ${key}`);
    const input = JSON.parse(options.body);
    assert.equal(input.model, REVIEW_MODEL); assert.equal(input.store, false);
    assert.equal(JSON.parse(input.input).clauses.map(clause => clause.text).join(''), text);
    assert.equal(input.text.format.strict, true); assert.equal(input.max_output_tokens, 18000);
    assert.ok(!options.body.includes(key)); assert.ok(!options.body.includes('not sent'));
    return completion(review());
  } });
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual((await response.json()).value, review()); assert.equal(calls, 1);
});

test('no upstream request occurs for missing credentials, foreign origin, excessive input or a key pasted in terms', async () => {
  let calls = 0;
  const options = { fetchImpl: async () => { calls++; throw Error('must not run'); } };
  for (const [input, headers, expected] of [[{ text }, { Authorization: '' }, 401], [{ text }, { Origin: 'https://other.test' }, 403], [{ text: 'x'.repeat(12001) }, {}, 400], [{ text: key }, {}, 400], [{ text: 'Clause.\n\n'.repeat(25) }, {}, 400]]) {
    assert.equal((await visitorReview(request(input, headers), options)).status, expected);
  }
  const escaped = JSON.stringify({ text: key }).replace('sk-', '\\u0073k-');
  const escapedRequest = new Request('https://example.test/api/review/visitor', { method: 'POST', headers: request().headers, body: escaped });
  assert.equal((await visitorReview(escapedRequest, options)).status, 400);
  assert.equal(calls, 0);
});

test('provider failures, redirects, refusals and incomplete/invalid reviews are sanitized and never retried', async () => {
  const cases = [
    [() => new Response(`private ${key}`, { status: 401 }), 401],
    [() => new Response('private', { status: 429 }), 429],
    [() => new Response('', { status: 302, headers: { Location: 'https://elsewhere.test' } }), 502],
    [() => Response.json({ status: 'incomplete' }), 502],
    [() => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }), 422],
    [() => completion({ reviews: [] }), 502],
    [() => { const value = review(); value.reviews[0].meaning = key; return completion(value); }, 502],
    [() => new Response('x'.repeat(1024 * 1024 + 1)), 502],
  ];
  for (const [upstream, expected] of cases) {
    let calls = 0;
    const response = await visitorReview(request(), { fetchImpl: async () => { calls++; return upstream(); } });
    assert.equal(response.status, expected); assert.equal(calls, 1); assert.ok(!(await response.text()).includes(key));
  }
});

test('canceling a stalled provider response cancels its reader and accepts no review', async () => {
  const controller = new AbortController(); let canceled = false;
  const responsePromise = visitorReview(request({ text }, {}, controller.signal), { fetchImpl: async () => new Response(new ReadableStream({
    start(stream) { stream.enqueue(new TextEncoder().encode('{')); setTimeout(() => controller.abort(), 10); },
    cancel() { canceled = true; },
  })) });
  assert.equal((await responsePromise).status, 499); assert.equal(canceled, true);
});
