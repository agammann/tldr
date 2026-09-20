# Real world validation

This is a dated integration history. For the current status, see [Verification](../VERIFICATION.md). For everyday setup, use [Installation](INSTALL.md). Earlier checkpoints below are retained to explain the fixes; later follow ups supersede their installation limitations.

Checked September 15, 2026, Pacific time (September 16 UTC). The initial published revision was `b88b45c03a7c6d3a08da86d985c989da8844ef68`.

## Findings and corrections

The initial revision was cloned from the public GitHub repository into a separate directory and installed with its frozen lockfile. Its fixture browser test passed. A Windows unit test failed because Git had converted fixture newlines to CRLF while the test expected LF. The review itself correctly normalized those newlines. The test now compares normalized text, includes an explicit CRLF regression case, and the repository specifies line endings through `.gitattributes`.

Live Spotify and GitHub terms exceeded the initial 48,000 character limit. The reviewed text limit is now 160,000 characters. Long results are paginated with `read_review_page`. The checks retrieve every page, verify the document identity and clause count, and reject duplicated or missing clause IDs. Removed clauses from comparisons are paginated as well. Nothing is silently dropped to make a summary fit.

Switching from static HTML extraction to rendered browser capture can change whitespace and navigation text without any provider policy change. History now reports `capture_method_changed` and creates a new baseline for that extraction method rather than reporting a provider change.

## Live public URL results after corrections

These were actual network requests made through the stdio MCP tool, without cookies, account sign in or a mocked response. Every numbered source page was retrieved. A second fetch of every page reported `unchanged`.

| Public document | Extracted characters | Clauses retrieved | Source pages | Result |
| :--- | ---: | ---: | ---: | :--- |
| [Dropbox terms](https://www.dropbox.com/terms) | 27,849 | 246 | 3 | Complete extraction retrieved |
| [Spotify US terms](https://www.spotify.com/us/legal/end-user-agreement/) | 56,167 | 223 | 4 | Complete extraction retrieved |
| [GitHub terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) | 49,082 | 342 | 4 | Complete extraction retrieved |
| [Cloudflare subscription agreement](https://www.cloudflare.com/terms/) | 46,676 | 396 | 4 | Complete extraction retrieved |
| [Firefox rights](https://www.mozilla.org/en-US/about/legal/terms/firefox/) | 7,815 | 148 | 1 | Complete extraction retrieved |
| [MCP Registry terms](https://modelcontextprotocol.io/registry/terms-of-service) | 7,892 | 72 | 1 | Complete extraction retrieved |

“Complete extraction” means all text extracted from that fetched page is available. It does not establish that every incorporated policy or personalized agreement was supplied. Navigation and footer text remain included, so counts may vary as sites change.

## Live browser capture

The extension was loaded in a fresh, isolated Microsoft Edge profile. Before invoking the extension action, capture of the public page was denied. The test then invoked the actual browser extension action with Chrome DevTools Protocol `Extensions.triggerAction`, granting activeTab access. The extension's own popup, scripting API, authenticated local bridge and MCP tool performed the capture. The test did not add broad website host permissions or replace the capture API with a mock.

| Rendered page | Characters captured | Clauses retrieved | Source pages | Truncated |
| :--- | ---: | ---: | ---: | :--- |
| Dropbox | 26,315 | 92 | 2 | No |
| Spotify | 55,852 | 156 | 4 | No |
| GitHub | 47,115 | 191 | 4 | No |

The original localhost browser fixture remains useful for controlled $12 to $24 price changes and password input exclusion. The public page test separately proves that capture works with the extension action permission flow on actual external sites.

## Evidence spot check

The Dropbox extraction preserved recurring billing, refund qualifications, advance notice of price changes and the arbitration opt out language, including the condition that an earlier opt out decision can remain binding. In this specific extraction those were clauses C0137, C0138, C0140 and C0172, with the US resident scope in C0170. Document SHA256: `d4b87871f9ad80ebf4a9bc6749bab8c5e1f2c8114070bb98cfb85c5c68593877`.

That check supports faithful evidence retrieval; it is not an assessment of enforceability or a recommendation to agree. Raw third party terms and browser pairing data are kept out of Git.

## Reproduce

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm test:browser
pnpm test:live
pnpm test:live-browser
```

Run these sequentially and follow the [development guide](../CONTRIBUTING.md#optional-integration-checks) for port and pairing precautions. Browser tests require an extension capable Edge/Chromium executable. On Windows they default to Edge; another executable can be selected using `BROWSER_EXECUTABLE`. Live results and local baselines are saved under `.local`, which is excluded from the repository. There were 14 controlled tests at this checkpoint; the later multiple session fix brought the total to 15. Live tests are separate from CI.

## Remaining limits

The final prose TLDR and judgment about which changes matter are generated by the connected assistant. This validation exercises an actual MCP client and live browser integration, but it does not establish compatibility with every assistant UI or prove legal accuracy. A real external assistant host was not configured for an automated semantic evaluation.

Chrome and Edge were independently exercised for the extension; the Chrome follow up is recorded below. Login protected agreements, PDFs, inaccessible frames, dynamic interaction requirements, geographic variants and anti bot pages are not universally supported. Capture is explicit and comparison is on demand. There is no continuous monitoring or automatic signup interception.

## Google Chrome and local Codex setup follow up

Google Chrome 153.0.8010.37 passed the real Dropbox, Spotify and GitHub capture checks with the same character, clause and page counts in the table above. Permission was denied before the extension action and granted afterward. Every source page was retrieved without truncation. The controlled Chrome browser test also passed capture, baseline creation, a $12 to $24 price change, password input exclusion and policy link discovery.

The first Chrome attempt timed out while waiting for the extension to load. The test harness used the command line extension loading flag removed from normal Chrome. Both browser scripts now use `Extensions.loadUnpacked` through the browser testing API in an isolated temporary profile. See [Chrome's removal announcement](https://developer.chrome.com/blog/extension-news-june-2025) and [normal unpacked extension installation](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked). These test settings are not applied to the user's normal browser profile.

The local MCP was registered and enabled in Codex. An SDK client launched the exact command read back from that configuration, discovered all five tools, reviewed the fictional terms and verified that the browser bridge started and created its pairing file. At this checkpoint, the normal Chrome profile and direct host tool invocation had not yet been verified.

## Everyday Chrome and multiple Codex conversations

The extension was subsequently installed, enabled, pinned and paired in the normal Google Chrome profile. Capturing the actual Dropbox terms through its toolbar popup displayed **Page captured**, confirming that the authenticated bridge accepted the page.

Restarting the Codex MCP connections exposed all five tools in this conversation. The first direct `review_current_page` call found a real integration defect: Codex had started six MCP processes and only one could own the browser bridge port. Version 0.1.2 allows sessions with the same pairing to read the owner's snapshot through authenticated loopback HTTP, with response size and time limits. Captures remain in memory. Different tokens and website Origins cannot read them.

All 15 controlled tests pass after the fix. The real stdio test now connects two independent clients to the same pairing and verifies that both can review one capture. A separate regression test covers ownership recovery after exit, the required fresh capture after RAM loss, and rejection of different pairing tokens and browser Origins. Protocol tests select an isolated port so they can run alongside an everyday MCP instance.

After reloading Codex, the normal Chrome profile captured Dropbox terms at September 16, 2026, 05:18:17 UTC. This conversation directly invoked the installed `review_current_page` tool, then retrieved the second source page with `read_review_page`: 26,153 characters, 92 unique clauses, no truncation, matching page hashes. Document SHA256: `c6961c7c30126075e70f1f3fce12477e56301cc989d0842643103c58fe100a8e`. The first call created the browser baseline; a second review of the same capture returned `unchanged`. The assistant produced a cited TLDR from all retrieved clauses. This completes the actual Chrome extension to Codex MCP to assistant review path. It does not constitute a legal accuracy benchmark or a fresh second website fetch. The different count from isolated browser tests reflects captured page text, not a claim of changed provider terms.

## September 19, 2026: user workflow retest and fixes

Checked on Windows with Node 24.19.0 and pnpm 11.19.0, on September 19 Pacific time (September 20 UTC). MCP 0.1.4 and extension 0.1.3 contain these changes:

* Fixed a popup initialization race: choosing a pairing file before asynchronous settings initialization finished could lose the selection event. Event handlers now register before settings finish and wait for readiness. The browser test deliberately holds settings loading until after a file is selected to reproduce this timing.
* Added a visible capturing status, explicit partial status for selected text, and a readable error for empty pages. An empty capture leaves the last successful snapshot intact.
* Integration scripts now use temporary state, their own pairing and a free loopback port, overriding both current and legacy environment variables. They ran alongside the existing everyday bridge. Extension pairing accepts explicit ports only on the literal 127.0.0.1 address; tests reject remote hosts, credentials, paths, invalid ports and malformed tokens.
* Browser screenshots now go into ignored .local storage instead of overwriting the historical tracked screenshot.

All 16 controlled tests passed. A separate checkout with the patch copied in installed using the frozen lockfile and passed the same 16 tests. This exercised a clean dependency installation on Windows; it is not a claim of a new macOS or Linux installation test.

The expanded controlled browser suite passed in Chrome 153.0.8010.53 and Edge 153.0.4234.46. It checks actual extension loading, delayed initialization, pairing, capture, a fictional $12 to $24 price change, policy links, exclusion of password/input/textarea values, selected text, 160,000-character truncation, preserved full baselines, empty pages, rejection of a wrong token, disconnected guidance and forgetting a connection.

### Live URL checks

Each URL produced a first baseline, returned every source page without duplicate clause IDs, and returned unchanged on a fresh second fetch. These checks use the public sites over the network, not saved fixtures.

| Provider | Characters | Clauses | Source pages |
| :--- | ---: | ---: | ---: |
| Dropbox | 27,849 | 246 | 3 |
| Spotify | 56,167 | 223 | 4 |
| GitHub | 49,082 | 342 | 4 |
| Cloudflare | 46,676 | 396 | 4 |
| Mozilla | 7,996 | 149 | 1 |
| MCP Registry | 7,892 | 72 | 1 |

The commands and public URLs are in scripts/live-check.mjs. Extracted source completeness does not establish completeness of linked, regional or account-specific policies.

### Live Chrome capture

The live browser suite passed on the public Dropbox, Spotify and GitHub pages with Chrome 153.0.8010.53. Before invoking the extension action, page access was denied; after invoking it, capture succeeded. All returned pages were read and none were truncated.

| Provider | Characters | Clauses | Source pages |
| :--- | ---: | ---: | ---: |
| Dropbox | 26,315 | 92 | 2 |
| Spotify | 55,852 | 156 | 4 |
| GitHub | 47,115 | 191 | 4 |

These are installed browser executables with isolated headless profiles, using the browser extension action API. They do not simulate the capture payload, but they are not an external user study. The normal-profile UI retest was stopped by the computer-use tool because it could not reliably determine Chrome's current URL; no new normal-profile pass or extension reload is claimed.

The installed Codex review_terms_text tool also returned all seven clauses of a new fictional acceptance example, including a 14-day trial, $12 renewal, refund exception, limited content license, arbitration opt-out, liability exceptions, an unsupplied Privacy Policy reference and an embedded instruction treated as source text. This confirms direct host invocation; it does not measure legal accuracy or guarantee prompt-injection resistance. No actual agreements were accepted or signed.
