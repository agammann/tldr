# tldr

**Understand the terms before you agree.**

[Website and interactive example](https://terms-tldr.alx21.chatgpt.site) · [Installation guide](docs/INSTALL.md) · [Troubleshooting](docs/TROUBLESHOOTING.md)

tldr connects the terms page you choose in Chrome or Edge to your AI assistant. It supplies source clauses and changes since your last complete review, so your assistant can explain commitments and possible red flags with citations.

**The website is a public example and guide. To review your own pages, install the local MCP server and browser extension.** The website does not accept terms submissions. The extension is installed from this repository, not a browser store. Your assistant writes the summary; tldr requires no separate model API key.

## Get started

You need **Node.js 22 or later**, **pnpm 11.19.0**, **Chrome or Edge**, and an assistant that supports **local stdio MCP servers**. Codex with Chrome has been verified. Other assistants may use different configuration formats.

1. Get the project and install its dependencies:

   ```sh
   git clone https://github.com/agammann/tldr.git
   cd tldr
   pnpm install --frozen-lockfile
   ```

   No Git? [Download the ZIP](https://github.com/agammann/tldr/archive/refs/heads/main.zip), extract it, and open a terminal in the folder containing `package.json`. Run the install command there.

2. [Connect the MCP to your assistant](docs/INSTALL.md#2-connect-your-assistant). The assistant starts the server. Use the full path to `src/server.mjs`.
3. [Load and pair the extension](docs/INSTALL.md#3-load-and-pair-the-extension). Import the `.local/pairing.json` file created when the MCP starts.
4. Open the actual terms page, clear any selected text if you want a full review, and click **Capture this page**. Wait for **Page captured**, then ask your assistant:

   > Review my captured terms. Read all source pages. Tell me the important terms, what changed, and any red flags. Cite the clauses and preserve exceptions. State the captured URL and whether the review is complete.

The [full installation guide](docs/INSTALL.md) includes prerequisites, Windows and macOS/Linux paths, Codex setup, pairing, and a first review check. Normal setup lets the assistant manage the server; you do not need a separate terminal running `pnpm start`.

## What you get

| Question | What tldr provides |
| :--- | :--- |
| What am I agreeing to? | Captured or supplied text, split into cited clauses for your assistant to read. |
| What changed? | Added and removed text compared with the last complete review of the same URL. The first review creates a baseline. |
| What deserves attention? | Topic hints for billing, cancellation, content rights, data use, disputes and other commitments. Your assistant must read the clauses and preserve exceptions. |
| Where did that conclusion come from? | Clause references such as `[C0002]`, with numbered source pages for long agreements. |

Capture is initiated by your click. Comparisons run when you request a review. There is no background monitoring, automatic signing, or continuous access to your active tab.

## Privacy and limits

The MCP runs on your computer, and complete reviewed pages are stored there as plaintext baselines. **Your connected AI assistant receives the text it reviews**, so its data policies still apply. Keep the pairing file and review history private.

Selected text and oversized captures are marked partial and do not overwrite a complete baseline. Linked policies require separate review. PDFs, inaccessible frames, OCR and universal signup interception are outside this version. This is a reading aid, not legal advice or a guarantee that an agreement is safe to sign.

Read [privacy and limitations](docs/PRIVACY_AND_LIMITS.md) for storage, deletion, network behavior and coverage details.

## Documentation

| Guide | Use it for |
| :--- | :--- |
| [Installation](docs/INSTALL.md) | Set up the MCP, pair Chrome or Edge, and complete your first review. |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Fix missing tools, pairing problems, capture errors and unexpected comparisons. |
| [Tools and review behavior](docs/REFERENCE.md) | Understand the five MCP tools, source paging and comparison rules. |
| [Verification](VERIFICATION.md) | See what was tested and what remains outside the evidence. |
| [Real world validation](docs/REAL_WORLD_VALIDATION.md) | Read the dated Chrome, Edge and Codex integration record. |
| [Development](CONTRIBUTING.md) | Run checks, understand the repository and report a reproducible issue. |

## Project status

MCP **0.1.3** · Extension **0.1.2**. The public repository is [agammann/tldr](https://github.com/agammann/tldr). The website retains its original `terms-tldr` address. Existing installation folders and pairing files remain compatible with the rename; see [updating an installation](docs/INSTALL.md#updating-an-existing-installation).

The source is public, but no project redistribution license has been assigned. Dependency licenses remain with their respective authors. The package's `private` flag prevents accidental npm publication; it does not describe GitHub visibility.
