# Verification record

[Back to the README](README.md) · [Detailed integration history](docs/REAL_WORLD_VALIDATION.md)

## Current evidence

Current code: MCP **0.1.3**, extension **0.1.2**. The product was renamed to tldr on September 16, 2026 UTC. Existing pairing, history and bridge protocol compatibility were preserved.

| Check | Recorded result | Scope |
| :--- | :--- | :--- |
| Controlled tests after the rename | 15 passed, zero failures | Evidence, comparison, storage, network validation, authenticated bridge and real MCP stdio calls. |
| Multiple MCP conversations | Passed | Sessions sharing a pairing can review one capture. Ownership recovery and rejection of different pairings were tested. |
| Live public URL review | Six documents retrieved completely and repeated as unchanged | All extracted pages were read. This does not establish that linked or personalized policies were included. |
| Chrome and Edge integration | Passed on Dropbox, Spotify and GitHub | Extension action permission, capture and complete source paging in isolated profiles. |
| Everyday Chrome through installed Codex | Completed September 16 at 05:18:17 UTC | Dropbox capture: 26,153 characters, 92 clauses across two pages, followed by an unchanged repeat of the same snapshot. |
| Public website | Published on OpenAI Sites | Predefined example and guide. No hosted AI review or remote MCP endpoint. |
| Website redesign | Syntax, assets, anchors and example JSON checked | The redesign did not repeat the original site's browser visual checks. |

The [integration history](docs/REAL_WORLD_VALIDATION.md) records original failures, corrections, hashes, counts and dated follow ups. Earlier checkpoints describe the state at that time; they are not current installation instructions. The historical [extension screenshot](examples/extension-verified.png) predates the rename.

## Evidence boundaries

These tests do not measure legal accuracy or prove compatibility with every assistant. The connected model writes the summary and determines which changes deserve attention. No universal support is claimed for PDFs, inaccessible frames, login protected agreements, geographic variants or restricted sites.

The extension is not published in a browser store. The MCP is local and has no continuous monitor or agreement acceptance automation.

## Reproduce

Follow [installation](docs/INSTALL.md) for everyday use. Follow [development](CONTRIBUTING.md) for controlled tests and optional browser/live checks, including port and pairing precautions.

## Documentation cleanup validation

On September 17, 2026, a fresh clone installed successfully with Node 24.19.0, pnpm 11.19.0 and the frozen lockfile, using a cache inside the verification workspace. All 38 local documentation links and heading references passed, all 15 external documentation destinations returned HTTP 200, the installation JSON parsed, and the referenced PNG was valid. No runtime source changed in this cleanup.

The fresh local test attempt was blocked before test bodies ran: this session denied Node child process creation with `spawn EPERM`. The 15 passing tests above are retained prior evidence, not a claimed fresh pass. Check the repository's Actions results for remote validation of this documentation revision.
