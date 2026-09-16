# Terms TLDR

A local MCP and browser extension for the question: **What am I agreeing to, what changed, and what should I look closely at?**

The extension captures the page you choose. The MCP supplies cited clauses, policy links and differences from the last saved copy. Your connected AI assistant writes the short explanation. The server does not call a separate model provider or require an API key.

## What is implemented

1. Capture the current browser page after an explicit click, or just its selected text.
2. Discover candidate terms, privacy and policy links on that page.
3. Fetch public HTTPS terms pages, or accept pasted text.
4. Return every supplied/extracted clause with a stable ID within that review. Long reviews use numbered pages so the assistant can retrieve the complete text.
5. Highlight navigation hints for payments, cancellation, data use, content rights, disputes, liability, changes and governing law.
6. Save the latest reviewed text for up to 30 exact URLs and compare the next review with that baseline.
7. Ask the assistant to explain important changes and possible red flags with source citations and relevant exceptions.

A first review explicitly reports that no prior copy exists. This is comparison on demand, not background monitoring. The extension does not click agreement buttons or submit forms.

## Run locally

Requires Node.js 22 or later and pnpm 11.19.0.

```powershell
git clone https://github.com/agammann/terms-tldr.git
cd terms-tldr
pnpm install --frozen-lockfile
pnpm test
pnpm start
```

`pnpm start` runs a stdio MCP server. A quiet terminal waiting for input is expected. Normally your assistant starts this process using its MCP configuration, so do not also leave a separate copy running on the same port.

Copy [mcp-config.example.json](mcp-config.example.json) into your assistant's MCP settings and replace the example path with your checkout's absolute path. A machine specific `mcp-config.json`, if present locally, is excluded from Git.

```json
{
  "mcpServers": {
    "terms-tldr": {
      "command": "node",
      "args": ["/absolute/path/to/terms-tldr/src/server.mjs"]
    }
  }
}
```

This is a stdio client configuration, not a remotely hosted MCP URL. The included SDK client test verifies the protocol. Host specific installation and UI behavior must be checked in the assistant you choose.

For Codex, register the server with an absolute path:

```powershell
codex mcp add terms-tldr -- node "C:\path\to\terms-tldr\src\server.mjs"
codex mcp get terms-tldr
```

If Node is not on your PATH, replace `node` with the full path to `node.exe`. Codex starts the server when it connects. If the tools do not appear in an existing session, restart the client to reload its configuration. See the [official Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## Connect the browser extension

1. Start the MCP through your assistant.
2. Open the browser extensions manager in Chrome or Edge, enable Developer mode, and choose **Load unpacked**.
3. Select the [extension](extension) directory in this project.
4. Open the extension popup and expand **Connect to your local MCP**.
5. Choose this project's `.local/pairing.json` file. The MCP creates it on first startup. It contains a local access token, so keep it private.
6. Open the signup or terms page and click **Capture this page**.
7. Ask your connected assistant: **Review my captured page. Tell me the important terms, anything important that changed, and any red flags. Cite the clauses.**

The extension intentionally needs a click for each new capture. The assistant sees the most recent snapshot and its capture time, not continuous access to your active tab. On a signup page, the assistant should use the discovered policy links to review the actual agreement. For login protected terms, open the agreement and capture its rendered text directly.

The registered `before_you_agree` MCP prompt performs this same workflow. It also accepts an optional `source` containing pasted text or a public URL.

## Tools

| Tool | Purpose |
| :--- | :--- |
| `review_current_page` | Review the latest browser snapshot and compare a complete capture with the saved baseline. |
| `review_terms_url` | Fetch an HTML or plain text page and compare it with the previous copy for the same final URL. |
| `review_terms_text` | Review pasted text without saving it to history. |
| `compare_terms_text` | Compare two explicitly supplied copies without saving them. |
| `read_review_page` | Retrieve the remaining current or removed clauses from a long review without advancing history. |

The MCP returns evidence, not a generated legal opinion. Its topic index uses English keyword matching. The assistant must read all clauses and all returned pages, retain negations and exceptions, explain uncertainty, and avoid declaring an agreement safe or enforceable. A missed keyword is not proof that a provision is absent. If a host cannot retrieve the remaining pages, its answer must be labeled partial. Page snapshots are kept in memory for 20 minutes, with at most eight reviews retained.

## What the answer should look like

For the [fictional example](examples/fictional-terms.txt), an appropriate assistant response would explain:

1. The trial lasts 14 days, followed by $12 each month. Cancel at least 24 hours before billing to avoid the next charge. [C0002]
2. Cancellation is through Account Settings; paid fees are generally nonrefundable, with an exception where law requires otherwise. [C0003]
3. Notes remain yours. The service gets a limited operating license and explicitly says it does not train AI on your notes. [C0004]
4. Individual arbitration and a class action waiver deserve attention. The small claims exception and 30 day arbitration opt out are relevant qualifications. [C0006]
5. Liability is generally capped at three months of fees, subject to stated legal exceptions. [C0007]

It should also say that the separate Privacy Policy was not supplied and that no earlier version is available on the first review. This example is written from a fictional fixture, not a real provider assessment or a measured model evaluation.

## Privacy and storage

Page captures remain in MCP process memory until replaced or the process exits. Complete pages that you ask the MCP to review become local plaintext baselines in `.local/history.json`. The latest reviewed copy replaces the previous baseline; at most 30 URLs are retained. URL keys include query strings, which may contain account information. Avoid capturing personal pages unnecessarily.

The browser pairing token is saved in `.local/pairing.json` and in extension local storage, restricted to trusted extension contexts. The bridge listens only on `127.0.0.1:43187`, requires the token, checks the HTTP Host, and rejects ordinary website Origins. One MCP instance owns the bridge port; other conversations using the same pairing read its snapshot through an authenticated local request. The latest explicit capture is shared across those conversations. A different pairing cannot read it. When the owner exits, a subsequent review can start a replacement bridge; the lost RAM snapshot must be captured again. Restart all Terms TLDR connections after upgrading an older single instance version.

Your AI host receives the source text when it invokes a tool. Its own data policies therefore apply. Local operation does not mean the assistant's model runs locally. The URL tool contacts the requested website without browser cookies or login credentials. No telemetry or analytics is implemented.

To erase saved terms, stop the MCP and delete `.local/history.json`. To reset pairing, stop the MCP, delete `.local/pairing.json`, restart, and import the new pairing file in the extension. Removing extension connection settings alone does not erase review history.

## Limits

1. Public URL fetching supports static UTF8 HTML and plain text, with a 1 MiB response cap, 160,000 character extracted text cap, 15 second timeout and at most three redirects. Every destination is checked; DNS results are pinned for the request.
2. PDF extraction, OCR, inaccessible frames, shadow DOM content, and interaction with agreement buttons are outside this version. Dynamic or authenticated terms should be opened and captured in the browser.
3. Captures beyond 160,000 characters are explicitly partial. Selected text is also partial. Neither replaces a full page baseline.
4. Page text can include navigation and footer content. Differences may reflect formatting, localization, plan, account or navigation changes. The tool does not claim every detected change alters the agreement. Switching between browser capture and URL extraction starts a new baseline and is explicitly labeled as a capture method change.
5. Linked policies are listed, not automatically fetched. Completeness of the agreement and correspondence with the exact signup flow remain unverified.
6. Source text can contain malicious instructions. Server prompts tell the assistant to treat it as untrusted evidence; this is not a guarantee against model prompt injection.
7. Semantic summarization and red flag judgment belong to the connected model. The automated tests verify capture, evidence, comparison and MCP behavior; they do not establish legal accuracy.

## Verification and development

```powershell
pnpm test
pnpm demo
pnpm test:browser
```

Tests exercise clause preservation, negation and price changes, baseline state, partial capture behavior, private address rejection, HTML extraction, bridge authentication and real MCP stdio calls. `pnpm demo` uses fictional terms and prints the exact evidence returned through the SDK client.

The browser smoke test opens a fresh temporary browser profile and uses a fictional page served on loopback. On Windows it defaults to Microsoft Edge. Set `BROWSER_EXECUTABLE` to use another extension capable Chromium executable. Other platforms use the Playwright default browser, which must be installed separately. Run browser and protocol tests sequentially because both exercise bridge port 43187. The smoke test does not alter your normal browser profile.

For optional live checks, run `pnpm test:live` and then `pnpm test:live-browser`. These contact real public terms pages and can fail if providers change their sites or restrict access. The browser check uses an isolated browser profile and the browser's extension action test API to exercise the activeTab permission grant on Dropbox, Spotify and GitHub. Chrome and Edge have both passed this check. Its special extension debugging flag is restricted to that temporary test profile. Tests use `Extensions.loadUnpacked` because normal Google Chrome removed the old command line extension loading flag. Everyday installation still uses **Load unpacked** in the extensions manager. Live evidence is saved under the ignored `.local` directory. Normal CI uses controlled fixtures on Windows and Linux with Node 22 and 24.

To select Google Chrome on Windows for either browser test:

```powershell
$env:BROWSER_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
pnpm test:browser
pnpm test:live-browser
```

Stop any connected Terms TLDR MCP before running browser tests, then reconnect afterward. Those tests use a separate pairing on the same local bridge port and intentionally cannot read the everyday capture. Protocol tests choose a separate available port using the internal `TERMS_TLDR_BRIDGE_PORT` setting, so `pnpm test` can run while your everyday MCP is connected. Keep the default port for normal extension setup.

See [the real world validation report](docs/REAL_WORLD_VALIDATION.md) for the six live page results, browser permission checks, corrections and remaining limitations.

[VERIFICATION.md](VERIFICATION.md) records the checks actually performed and the remaining boundaries.

The source repository is public at [agammann/terms-tldr](https://github.com/agammann/terms-tldr). The MCP runs locally; it is not a hosted service or a published browser store extension. No project redistribution license has been assigned. Dependency licenses remain their respective authors' licenses. The package's `private` flag prevents accidental npm publication and does not describe GitHub visibility.

Implementation references: [MCP SDK server documentation](https://ts.sdk.modelcontextprotocol.io/server), [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting), and [extension network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).
