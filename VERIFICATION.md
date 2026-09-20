# Verification record

[Back to the README](README.md) · [Detailed integration history](docs/REAL_WORLD_VALIDATION.md)

## Current evidence

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
