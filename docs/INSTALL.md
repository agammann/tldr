# Install tldr

[Back to the README](../README.md) · [Troubleshooting](TROUBLESHOOTING.md)

You will install the MCP, connect it to your assistant, and pair the browser extension. The public website can be visited without installation, but it cannot read your browser tabs.

## 1. Prepare your computer

Use Node.js 24 or later, pnpm 11.19.0, Chrome or Edge, and an assistant that can launch local stdio MCP servers. An assistant that accepts only remote MCP URLs cannot use this version directly. This local MCP workflow does not need an additional model API key. The optional pasted-text review on the website uses your own OpenAI API key separately.

Install [Node.js](https://nodejs.org/en/download), then install the project's pinned pnpm version:

```sh
npm install --global pnpm@11.19.0
node --version
pnpm --version
```

The first version should be 24 or later; the second should be `11.19.0`. Reopen your terminal after installation if it does not recognize the commands. Follow the [pnpm installation documentation](https://pnpm.io/installation) if a global install is unavailable. If PowerShell blocks a `.ps1` shim, use `npm.cmd` or `pnpm.cmd` instead of changing the execution policy.

Get the current repository source for the instructions on this page:

```sh
git clone https://github.com/agammann/tldr.git
cd tldr
pnpm install --frozen-lockfile
```

The published [v1.0.2 release](https://github.com/agammann/tldr/releases/tag/v1.0.2) predates this Windows storage change. Its source and extension use `.local` on Windows; use the instructions bundled with that release. This checkout does not imply a new published release.

There is no service build step. Optional check: `pnpm test` should finish with zero failures. It does not test your assistant's connection or install the extension.

## 2. Connect your assistant

Choose **one** of the following methods. Do not register a second copy for the same setup. Keep the project in a stable folder: moving it later requires updating the assistant's path.

### Codex CLI

With the Codex CLI already installed, run this from the project directory in **Windows PowerShell**:

```powershell
codex mcp add tldr -- node "$((Resolve-Path .\src\server.mjs).Path)"
codex mcp get tldr
```

For **macOS or Linux**:

```sh
codex mcp add tldr -- node "$(pwd)/src/server.mjs"
codex mcp get tldr
```

The printed configuration should point to this checkout's `src/server.mjs`. Reconnect or restart Codex so it loads the server. In desktop MCP settings, confirm tldr is enabled. See the [official Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) for current configuration controls and CLI options.

### Assistant settings

For a settings screen that accepts command and argument fields, set:

| Field | Value |
| :--- | :--- |
| Name | `tldr` |
| Transport | Local / stdio |
| Command | `node`, or the full path to your Node executable |
| Argument | The full path to `src/server.mjs` in this checkout |

For hosts that accept an `mcpServers` JSON object, adapt [mcp-config.example.json](../mcp-config.example.json). This is not Codex's TOML configuration format. Example Windows JSON:

```json
{
  "mcpServers": {
    "tldr": {
      "command": "node",
      "args": ["C:/Users/yourname/Projects/tldr/src/server.mjs"]
    }
  }
}
```

Replace the example path with your real path. On macOS/Linux, use a path such as `/Users/yourname/Projects/tldr/src/server.mjs`. Windows JSON supports forward slashes, or doubled backslashes. In a settings argument field, enter the path itself without surrounding JSON quotes.

If a desktop assistant cannot find Node, find the executable with `(Get-Command node).Source` in PowerShell or `command -v node` on macOS/Linux, then use that full path for the command. Save the settings and reconnect.

**Connection checkpoint:** your assistant should expose `review_current_page`, `review_terms_url`, `review_terms_text`, `compare_terms_text` and `read_review_page`. Starting the server creates `%LOCALAPPDATA%\TermsTLDR\pairing.json` on Windows or `.local/pairing.json` in the project on macOS/Linux. `TLDR_DATA_DIR` overrides this location. The assistant runs the process; a separate terminal running `pnpm start` is unnecessary. A manually started stdio server waiting silently for input is normal.

## 3. Load and pair the extension

1. Keep the MCP connected in your assistant.
2. Type `chrome://extensions` into Chrome's address bar, or `edge://extensions` into Edge's address bar.
3. Enable **Developer mode**, select **Load unpacked**, and choose this project's **extension** folder. Select the folder containing `manifest.json`, not the repository root or ZIP file.
4. Pin **tldr** from the browser's extensions menu, then open its popup.
5. Expand **Connect to your local MCP** and choose the pairing file at the location above.

The popup should say **Connected settings saved**. This confirms the settings were imported; the next capture checks whether the running MCP can actually be reached. Never paste the pairing token into a chat or issue.

On Windows, enter `%LOCALAPPDATA%\TermsTLDR\pairing.json` in the file chooser if needed. If `.local` is hidden on macOS, Command+Shift+Period toggles hidden files. If the file does not exist, return to the connection checkpoint above.

The [Chrome unpacked extension guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) illustrates the installation controls. Managed browsers may restrict Developer mode.

## 4. Complete your first review

Open the actual terms page in a normal HTTP or HTTPS tab. Clear selected text unless you intentionally want only that selection reviewed. Click **Capture this page** and wait for **Page captured**.

Ask your assistant:

> Review my captured terms. Read all source pages. Tell me the important terms, what changed, and any red flags. Cite the clauses and preserve exceptions. State the captured URL and whether the review is complete.

Check that the answer names the URL you captured and cites source clauses. The first complete review establishes a baseline, so it cannot claim changes against an earlier copy. Long reviews require the assistant to call `read_review_page` until it has every source page.

For a later comparison, open the page again, capture it again, and request another review. Calling the tool twice without another capture only reviews the same snapshot. On signup pages, ask the assistant to follow discovered terms links; signup text alone may not contain the agreement.

You can also review pasted terms or a public URL without the extension. See [tools and review behavior](REFERENCE.md).

## Updating an existing installation

In a Git checkout, run:

```sh
git pull --ff-only
pnpm install --frozen-lockfile
```

If Git reports local changes or divergence, keep those changes and resolve the conflict before continuing. For a ZIP installation, extract a fresh copy and update the assistant and extension paths. On Windows, the new per-user data directory is independent of the source checkout; follow the migration steps below for older `.local` state. On macOS/Linux, stop all tldr MCP connections before copying a private `.local` folder into a new project folder.

Reload the unpacked extension in the extensions manager, reconnect all tldr MCP sessions, and capture again. State in the configured directory remains available across source updates.

Older installations may be registered as `terms-tldr`. That label remains usable. If you rename it, edit the existing entry instead of adding a duplicate, and keep the argument pointed at the real checkout. Local folders do not need renaming.

[Continue to troubleshooting](TROUBLESHOOTING.md) if a checkpoint fails.

## Security update and pairing rotation

For version 1.0.1, update the local MCP source and the unpacked extension together. Stop every MCP session, install the new source dependencies, reload the unpacked extension in the browser, and reconnect all assistant sessions. Existing pairing files remain readable. Older clients use a plaintext protocol and are deliberately rejected; do not keep an old extension connected to a new service or the reverse.

### Windows private-state migration

The Windows default in this checkout is `%LOCALAPPDATA%\TermsTLDR`. The MCP checks the parent and its ancestors for unsafe ownership, replacement rights and reparse points, and checks that the state directory and any existing `pairing.json` or `history.json` grant access only to your account, SYSTEM and Administrators. A newly created directory is protected before state is saved; an existing directory with unsafe permissions is rejected, even when empty. It does not repair existing unsafe stores, because another account could already have an open handle. An explicitly configured directory needs a private parent and safe ancestors. These checks conservatively reject some configurations and assume your account, SYSTEM, Administrators and Windows TrustedInstaller are trusted; they cannot protect against those identities, previously exposed secrets or pre-existing access to the selected store. If a check fails, choose a new private per-user location and inspect its permissions; do not copy an old pairing file into it.

For an older checkout with `.local` state, stop all tldr MCP sessions. Treat the old pairing as potentially exposed if that directory was readable by other accounts. Start the updated MCP without `TLDR_DATA_DIR` to create a new private pairing, choose **Forget connection** in the extension, and import the new `%LOCALAPPDATA%\TermsTLDR\pairing.json`. If you need past comparisons, inspect the old `history.json` and its permissions, then copy only that file into the new private directory while the MCP is stopped. Remove access for other accounts on the copied file before reconnecting; the MCP will refuse to read it otherwise. The old source-folder data is not moved or deleted automatically. A private copy cannot undo any earlier disclosure.

If an unrelated process ever owned your bridge port during an earlier capture or shared-session read, rotate the pairing. Stop every MCP session first, back up your private history, then delete only `pairing.json` from your configured local data directory. Restart the updated service to create a new random pairing, choose **Forget connection** in the extension, and import the new pairing file. Do not delete or publish the review history. Treat old pairing backups as sensitive and keep them offline or remove them securely. A successful new connection does not prove the old token was never exposed.

## Backup and restore

Stop all tldr MCP connections before copying the private data directory. It contains `pairing.json` and `history.json`: `%LOCALAPPDATA%\TermsTLDR` on Windows, `.local` on macOS/Linux, or the configured `TLDR_DATA_DIR`. Keep the backup in a location with equally private permissions. Never upload it to GitHub or send the files to an assistant.

To restore, stop the service, preserve the current directory separately, and copy the complete backup into the configured data directory. Use the same bridge port as the backup, reconnect the service, and capture the page again. The latest capture and paginated review snapshots exist only in memory. A matching unchanged document should report `unchanged`; later edits compare with that restored complete baseline. Restore or repair malformed history before continuing; it is never silently replaced. Reload and re-pair the extension if its saved settings no longer match.
