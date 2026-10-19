# Changelog

## 1.0.1

- Encrypt and authenticate extension captures and shared MCP responses with the existing local pairing key, separate directional keys, and one-use server challenges.
- Reject legacy plaintext bridge clients and document upgrading the MCP and extension together, plus pairing rotation if the earlier listener was untrusted.
- Add regressions for local port squatting, listener replacement, replay, tampering, wrong pairing keys, and legitimate shared sessions.

## 1.0.0

- Publish matching 1.0.0 local MCP and unpacked browser extension source packages with MIT licensing and checksums.
- Apply available MCP SDK and browser-test dependency updates.
- Preserve malformed saved history and explain how to restore a backup before comparing.
- Document supported installation, source citations, complete-review comparison, identity pairing and private history recovery.
- Verify the downloaded source and extension packages before main-only release publication.
