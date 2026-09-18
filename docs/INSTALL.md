# Install tldr

[Back to the README](../README.md) · [Troubleshooting](TROUBLESHOOTING.md)

You will install the MCP, connect it to your assistant, and pair the browser extension. The public website can be visited without installation, but it cannot read your browser tabs.

## 1. Prepare your computer

Use Node.js 22 or later, pnpm 11.19.0, Chrome or Edge, and an assistant that can launch local stdio MCP servers. An assistant that accepts only remote MCP URLs cannot use this version directly. You do not need an additional model API key for tldr.

Install [Node.js](https://nodejs.org/en/download), then install the project's pinned pnpm version:

```sh
npm install --global pnpm@11.19.0
node --version
pnpm --version
```

The first version should be 22 or later; the second should be `11.19.0`. Reopen your terminal after installation if it does not recognize the commands. Follow the [pnpm installation documentation](https://pnpm.io/installation) if a global install is unavailable. If PowerShell blocks a `.ps1` shim, use `npm.cmd` or `pnpm.cmd` instead of changing the execution policy.

Get the repository:

```sh
git clone https://github.com/agammann/tldr.git
cd tldr
pnpm install --frozen-lockfile
```

Alternatively, [download the ZIP](https://github.com/agammann/tldr/archive/refs/heads/main.zip), extract it, and open a terminal in the folder containing `package.json`. Run `pnpm install --frozen-lockfile` there. A ZIP usually extracts to `tldr-main`; use that actual folder name in every path below.

There is no build step. Optional check: `pnpm test` should report 15 passing tests. It does not test your assistant's connection or install the extension.

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

**Connection checkpoint:** your assistant should expose `review_current_page`, `review_terms_url`, `review_terms_text`, `compare_terms_text` and `read_review_page`. Starting the server also creates `.local/pairing.json` in the project. The assistant runs the process; a separate terminal running `pnpm start` is unnecessary. A manually started stdio server waiting silently for input is normal.

## 3. Load and pair the extension

1. Keep the MCP connected in your assistant.
2. Type `chrome://extensions` into Chrome's address bar, or `edge://extensions` into Edge's address bar.
3. Enable **Developer mode**, select **Load unpacked**, and choose this project's **extension** folder. Select the folder containing `manifest.json`, not the repository root or ZIP file.
4. Pin **tldr** from the browser's extensions menu, then open its popup.
5. Expand **Connect to your local MCP** and choose the project's `.local/pairing.json` file.

The popup should say **Connected settings saved**. This confirms the settings were imported; the next capture checks whether the running MCP can actually be reached. Never paste the pairing token into a chat or issue.

If `.local` is hidden, enter its full path in the file chooser. On macOS, Command+Shift+Period toggles hidden files in the chooser. If the file does not exist at all, return to the connection checkpoint above.

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

If Git reports local changes or divergence, keep those changes and resolve the conflict before continuing. For a ZIP installation, extract a fresh copy and update the assistant and extension paths. To retain existing pairing and history, stop all tldr MCP connections before copying the old private `.local` folder into the new project folder.

Reload the unpacked extension in the extensions manager, reconnect all tldr MCP sessions, and capture again. If the project stays in the same location, its pairing and history remain available.

Older installations may be registered as `terms-tldr`. That label remains usable. If you rename it, edit the existing entry instead of adding a duplicate, and keep the argument pointed at the real checkout. Local folders do not need renaming.

[Continue to troubleshooting](TROUBLESHOOTING.md) if a checkpoint fails.
