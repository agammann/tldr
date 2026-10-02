# Verification record

[Back to the README](README.md) · [Detailed integration history](docs/REAL_WORLD_VALIDATION.md)

## Current evidence

On October 2, 2026 UTC, MCP **0.1.4** and extension **0.1.3** passed a fresh Windows review with Node 24.19.0 and pnpm 11.19.0:

- All 16 controlled tests passed. The lockfile now uses fast-uri 3.1.8 and ip-address 10.7.2; the dependency audit reported no known advisories. CI now includes that audit.
- The extension passed controlled browser checks in Chrome 154.0.8037.95 and Edge 154.0.4258.48, including actual capture, changed prices, excluded form values, partial captures, pairing errors, and disconnected guidance.
- Six actual public URL reviews retrieved every source page and repeated as unchanged: Dropbox, Spotify, GitHub, Cloudflare, Mozilla, and the MCP Registry. Chrome and Edge also captured Dropbox, Spotify, and GitHub through the real extension action permission flow, with no truncation.
- All five tools passed through **Codex app-server 0.159.2** in an ephemeral test session. Native host calls retrieved all 180 clauses of a fictional paginated review, detected a supplied price change, fetched the public Mozilla page, and read an actual Chrome extension capture of Dropbox. The capture returned 26,315 characters and all 92 clauses across two pages; a repeat reported unchanged.

The native host check used an isolated pairing and browser profile without changing the user's persistent MCP configuration. It exercised tool calls, not a model-generated summary or a legal accuracy benchmark. Third-party terms and pairing data remain outside the repository. Earlier records below are preserved as dated evidence.

## Optional hosted review — October 2, 2026

The website now has a separate, opt-in pasted-text review using the visitor’s own OpenAI API key and GPT-5.4. The MCP and extension behavior is unchanged.

- A fresh frozen dependency install, all **22 controlled tests**, the website Worker build and dependency audit passed on Windows with Node 24.19.0 and pnpm 11.19.0. Six tests cover full source retention, input limits, ordered clause coverage, exact quotations, provider routing, credential handling, error handling and cancellation; they use controlled provider responses.
- A real isolated Edge browser passed **28 local website checks** with controlled responses: the original example, explicit submission, rejected oversized input, safe text rendering, source disclosures, edited drafts during requests, cancellation, retry, invalid responses, clearing, reload and leave/return behavior. No page runtime errors occurred. Layouts at 320, 390 and 1440 pixels had no horizontal overflow. Private server/build files were unavailable as public assets.
- Six initial fictional English agreements completed through the actual OpenAI route with all source segments and matching quotations. Five small cases were inspected against 36 expected facts, including prices and taxes, cancellation and refund conditions, retention exceptions, training opt-in, unknown or missing policy details, an arbitration opt-out with a surviving class waiver, liability exceptions, cross-references and embedded instructions. The sixth case exercised the full 12,000-character and 24-segment boundary with a first-clause rule qualified by the final clause.
- A subsequent real browser submission exposed a semantic error despite valid coverage and quotations: the model changed permission to cancel before a price increase into permission to cancel **only** before it. The review instructions were tightened to distinguish permissions, deadlines and restrictions without inventing exclusivity. One focused real browser retry correctly stated that the supplied text did not establish a rule about cancellation after the price change, and retained the other dispute, notice and liability qualifications. That corrected run passed 19 browser checks, including the complete submitted sources, edits during generation, clear/reload cleanup, empty browser storage and 320/390/1440-pixel layouts. A separate actual invalid-key request returned an actionable 401 error and left retry available.

The published website then passed 30 checks in isolated Edge 154.0.4258.48. One real GPT-5.4 review retained all nine expected dispute, liability, notice and cancellation-permission facts, with four complete source segments and exact quotations. The app preserved edits made during generation; Clear and reload removed its key, content, result and consent. Local storage, session storage and IndexedDB were empty, and existing hosting cookies were unchanged. Missing-key requests returned 401, six private source/build paths returned 404, and the five public assets matched the deployment source after excluding only the hosting-added challenge wrapper from HTML. No page errors, console warnings/errors or failed requests occurred. Layouts at 320, 390 and 1440 pixels fit without horizontal overflow. This production check used the corrected prompt; the six earlier cases were not rerun after that wording change.

The real-provider checks establish the behavior of these examples at that time. Coverage and quotation validation are structural checks, not proof of correct interpretation, legal accuracy or preservation of every exception in other agreements. No legal advice or signing decision was tested or provided. Local browser checks with controlled responses are separate from actual model-quality checks; neither is a universal accuracy benchmark.

## September 19 evidence

Current code: MCP **0.1.4**, extension **0.1.3**. Latest checks ran September 19, 2026, Pacific time (September 20 UTC). Existing default pairing, history and bridge protocol compatibility are preserved.

| Check | Recorded result | Scope |
| :--- | :--- | :--- |
| Controlled tests and fresh dependency installation | 16 passed, zero failures | Node 24.19.0, pnpm 11.19.0, frozen lockfile. Repeated in a separate checkout with the pending patch copied in and no existing node_modules. |
| Multiple MCP conversations | Passed | Sessions sharing a pairing can review one capture. Ownership recovery and rejection of different pairings were tested. |
| Live public URL review | Six documents retrieved completely and repeated as unchanged | All extracted pages were read. This does not establish that linked or personalized policies were included. |
| Chrome live integration | Passed on Dropbox, Spotify and GitHub | Chrome 153.0.8010.53, isolated profile, actual extension action permission and complete source paging. No truncation. |
| Chrome and Edge controlled browser checks | Passed | Chrome 153.0.8010.53 and Edge 153.0.4234.46. Delayed initialization, pairing, price change, form value exclusion, partial captures, empty pages, authentication failure and disconnected guidance. |
| Installed Codex tool | Returned all seven clauses of a fictional acceptance example | A direct host tool call, separate from the SDK clients. No external user study or model accuracy benchmark. |
| Everyday Chrome through installed Codex | Completed September 16 at 05:18:17 UTC | Dropbox capture: 26,153 characters, 92 clauses across two pages, followed by an unchanged repeat of the same snapshot. |
| Public website | Published on OpenAI Sites | Predefined example and guide. No hosted AI review or remote MCP endpoint. |
| Website redesign | Syntax, assets, anchors and example JSON checked | The redesign did not repeat the original site's browser visual checks. |

The [integration history](docs/REAL_WORLD_VALIDATION.md) records failures, corrections, hashes, counts and dated follow ups. The latest normal-profile UI attempt stopped because the computer-use tool could not reliably determine the browser URL. It was not counted as a fresh everyday-profile pass. Earlier checkpoints describe the state at that time; they are not current installation instructions. The historical [extension screenshot](examples/extension-verified.png) predates the rename.

## Evidence boundaries

These tests do not measure legal accuracy or prove compatibility with every assistant. The connected model writes the summary and determines which changes deserve attention. No universal support is claimed for PDFs, inaccessible frames, login protected agreements, geographic variants or restricted sites.

The extension is not published in a browser store. The MCP is local and has no continuous monitor or agreement acceptance automation.

## Reproduce

Follow [installation](docs/INSTALL.md) for everyday use. Follow [development](CONTRIBUTING.md) for controlled tests and optional browser/live checks. The scripts now isolate their ports and pairing automatically.

## Documentation cleanup validation

On September 17, 2026, a fresh clone installed successfully with Node 24.19.0, pnpm 11.19.0 and the frozen lockfile, using a cache inside the verification workspace. All 38 local documentation links and heading references passed, all 15 external documentation destinations returned HTTP 200, the installation JSON parsed, and the referenced PNG was valid. No runtime source changed in this cleanup.

That September 17 test attempt was blocked before test bodies ran with `spawn EPERM`. The September 19 rerun succeeded: the latest passing results are listed above. The old environment failure is retained here as history, not a current blocker.
