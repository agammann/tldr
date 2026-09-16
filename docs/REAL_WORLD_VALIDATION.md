# Real world validation

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

Run these sequentially. Browser tests require an extension capable Edge/Chromium executable. On Windows they default to Edge; another executable can be selected using `BROWSER_EXECUTABLE`. Live results and local baselines are saved under `.local`, which is excluded from the repository. The 14 controlled tests run without third party network access; the live tests are deliberately separate from CI.

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
