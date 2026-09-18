# Troubleshooting

[Installation guide](INSTALL.md) · [Back to the README](../README.md)

| What you see | What to check |
| :--- | :--- |
| `node` or `pnpm` is not recognized | Install the prerequisites, reopen the terminal, and run the version checks in [installation](INSTALL.md#1-prepare-your-computer). A desktop assistant may require Node's full executable path. |
| Module or package cannot be found | Run `pnpm install --frozen-lockfile` in the folder containing `package.json`. Confirm the assistant points to that same checkout's `src/server.mjs`. |
| No tldr tools in the assistant | Enable the local stdio server and reconnect or restart the assistant. Verify the command and absolute path. The public website address is not an MCP endpoint. |
| `.local/pairing.json` is missing | The MCP creates it on startup. Check connection errors and the project folder. If `TLDR_DATA_DIR` is set, the file is created there instead. |
| Extension cannot load | Extract the ZIP first and choose the `extension` folder containing `manifest.json`. Developer mode must be available in your browser. |
| **Local MCP is not reachable** | Keep your assistant's MCP connection running, then capture again. Pair with the same checkout the assistant launches. Do not change the bridge port for the shipped extension. |
| **Capture failed (401)** or an incompatible pairing message | Reimport the current checkout's `.local/pairing.json`. Another checkout or a regenerated file may use a different token. |
| Bridge could not start on `127.0.0.1:43187` | Stop an old manually started tldr process or duplicate installation using a different pairing, then reconnect. Current sessions sharing one pairing can share the bridge. Reconnect every session after upgrading. Identify a process before stopping it; an unrelated service may own the port. |
| **No page captured** | Open a normal website tab and click the extension's capture button. A process restart may have discarded the previous snapshot. |
| Browser settings, store pages or a PDF cannot be captured | Use the actual HTML terms page in a regular HTTP/HTTPS tab. PDF extraction and browser internal pages are unsupported. |
| Only part of the page was reviewed | Clear your selection and capture again. Text over 160,000 characters is explicitly partial. For long complete reviews, ask the assistant to retrieve every page with `read_review_page`. |
| The review is for the wrong page | Check the captured URL and time. The MCP reads the latest explicit snapshot, even if you changed tabs. Capture the intended page again. |
| A later check still says **unchanged** | Capture again before asking. An unchanged repeat of one snapshot does not mean the website was fetched again. |
| The first review has no change report | Expected: a complete first review saves the baseline. There is no earlier copy to compare. |
| `capture_method_changed` | Switching between public URL extraction and browser capture starts a new baseline. Their text can differ without a policy change. |
| `comparison_skipped_partial_capture` | Selected or truncated text cannot replace a full baseline. Capture the complete page to enable comparison. |
| A source review expired | Request a new review and retrieve all pages promptly. Paged records expire after 20 minutes; only eight are retained per process. |
| Public URL fetching fails or misses dynamic text | Open the agreement in the browser and capture it. URL fetching has no account cookies and supports static HTML/plain text. |
| `pnpm start` appears to hang | It is a stdio MCP server waiting for protocol input, not a website. Use Ctrl+C to stop a manual run and let the assistant start it normally. |

## Resetting local data

Use these only when you intend to discard the corresponding data. Stop all tldr MCP sessions first.

To erase saved baselines, remove `.local/history.json` from the checkout. The next complete review starts a new baseline. To reset pairing, remove `.local/pairing.json`, restart the MCP, then import the newly generated file in the extension. **Forget connection** clears the extension's pairing settings but does not erase saved review history.

## Report an issue

Include your operating system, browser version, Node and pnpm versions, assistant name, the step that failed, and the error message. Use a public URL or fictional text if a sample is needed. Leave out `.local`, pairing files, tokens, private terms, personal page text and account details.

[Open a GitHub issue](https://github.com/agammann/tldr/issues).
