# Verification record

Verified locally on September 15, 2026, with Node.js 24.19.0, MCP SDK 1.30.0, pnpm 11.19.0 and Playwright 1.62.1.

The original checks and boundaries below are retained as the historical initial verification record. Current version 0.1.2 has 15 passing tests, six successful live URL reviews, live capture checks in Chrome and Edge, and a completed review from the user's normal Chrome profile through the installed Codex MCP. The multiple session bridge conflict found during host integration is fixed. All 92 clauses of the final Dropbox capture were retrieved across two source pages, and a repeat review of that snapshot reported unchanged. See [REAL_WORLD_VALIDATION.md](docs/REAL_WORLD_VALIDATION.md) for current evidence and scope; the older installation limitations below have been superseded there.

## Passed

1. `node --test test/*.test.mjs`: 11 tests passed, zero failures.
2. `node scripts/browser-smoke.mjs`: the actual unpacked extension loaded in an isolated, headless Microsoft Edge profile. The test selected the local pairing file, captured a real rendered fictional page through the extension's scripting API, and invoked the MCP through the official SDK stdio client.
3. The browser test verified discovery of a terms link, creation of a first baseline, and detection of a later $12 to $24 price change with both old and new source text.
4. A fictional password field value was excluded from that browser capture.
5. A live public HTTPS fetch of the official MCP Registry terms page succeeded. It extracted 7,892 characters and 33 links. This was a connectivity/extraction check, not a legal assessment.
6. The extension popup screenshot was inspected for readable layout and successful capture feedback: [verified popup](examples/extension-verified.png).

The core tests cover complete evidence preservation, exceptions and negation, input bounds, duplicates, reordering, history across process instances, partial capture protection, private and reserved IP rejection, mixed public/private DNS answers, HTML extraction, bridge authentication, rejection of website Origins, malformed captures, tool discovery, prompt retrieval and real protocol calls.

## Boundaries

The tested browser was Edge. The extension uses Chrome MV3 APIs, but a separate Chrome installation test was not completed. The bundled Chromium executable failed to launch in this environment; Edge provided the completed browser verification.

The full path from extension to MCP was exercised with fictional terms. No legal accuracy benchmark or automated model summarization evaluation was performed. The assistant host generates the final semantic TLDR and chooses which changes deserve attention. Keyword topic hints alone are not a semantic review.

The project has not been connected to the user's everyday assistant or browser profile, published to a registry or extension store, or deployed as a hosted service. There is no background monitoring, universal signup interception, PDF ingestion, or agreement acceptance automation.

The included [MCP configuration example](mcp-config.example.json) and [setup guide](README.md) are ready for local installation. Machine specific configuration, captured pages, local pairing tokens and review history are excluded from the public repository.

## tldr rename and website redesign

September 16, 2026 UTC: renamed product displays, extension manifest, MCP server identity, package metadata, setup examples and GitHub repository to tldr. MCP version 0.1.3 and extension version 0.1.2. All 15 controlled tests passed, including a connection using TLDR environment settings and a second connection using the compatible legacy settings. Website syntax, local asset references, internal anchors and example configuration JSON passed static checks. This redesign did not repeat the earlier browser visual checks. Existing pairing, history, local install paths and bridge protocol remain compatible.
