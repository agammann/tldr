# Development and contributions

[Back to the README](README.md) · [Verification record](VERIFICATION.md)

## Run locally

Use Node.js 22 or later and pnpm 11.19.0. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm test
```

The 15 controlled tests exercise evidence preservation, comparisons, history, network validation, authentication and real MCP stdio calls. They use isolated state and ports and do not require third party terms pages. CI defines Node 22 and 24 on Windows and Ubuntu.

## Optional integration checks

Run these sequentially. Before the demo or integration checks, stop everyday tldr MCP connections: these scripts use a separate pairing on the same default bridge port. Clear custom `TLDR_DATA_DIR`, `TLDR_BRIDGE_PORT` and their older aliases from the test terminal so they cannot redirect test state into your everyday installation.

| Command | What it checks |
| :--- | :--- |
| `pnpm demo` | Prints evidence for fictional terms through the SDK. It does not generate an AI summary. |
| `pnpm test:browser` | Loads the extension in an isolated profile and checks capture, a controlled price change, policy links and password input exclusion. |
| `pnpm test:live` | Fetches real public terms pages and reads all source pages. Requires network access. |
| `pnpm test:live-browser` | Exercises extension action permission and capture on public pages. Requires network access. |

On Windows the browser scripts default to Edge. To select Chrome in PowerShell:

```powershell
$env:BROWSER_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
pnpm test:browser
```

The variable also applies to `pnpm test:live-browser`. Other platforms need an extension capable Chromium executable; set `BROWSER_EXECUTABLE` to its installed path. Scripts use `Extensions.loadUnpacked` and, for live capture, `Extensions.triggerAction` in a temporary profile. They do not apply special extension debugging settings to your everyday profile. Live results can fail or change as providers update or restrict their sites. Reconnect your everyday MCP and capture again afterward.

## Repository map

| Path | Purpose |
| :--- | :--- |
| `src/` | MCP server, bridge, URL fetching, review evidence, paging and history. |
| `extension/` | Unpacked Chrome/Edge extension. |
| `test/` | Controlled Node tests. |
| `scripts/` | Demo and optional browser/live checks. |
| `examples/` | Fictional terms and a historical verification screenshot. |
| `docs/` | Installation, troubleshooting, reference and dated evidence. |
| `website/` | Static source for the separately published public website. |

Updating `website/` on GitHub does not deploy the public site. See its [README](website/README.md).

## Before opening a pull request

Keep changes scoped and explain the behavior they fix. Run `pnpm test` for runtime changes and `git diff --check` for every change. For documentation changes, check relative links, heading anchors, example JSON and referenced commands. Add regression coverage for changed behavior, and distinguish controlled checks from live provider checks.

Never commit `.local`, tokens, credentials, real captured terms or machine specific configuration. Report bugs with versions, reproduction steps and a public URL or fictional input. [Open an issue](https://github.com/agammann/tldr/issues) before proposing a major feature.

No project redistribution license has been assigned. This guide does not grant additional licensing rights.
