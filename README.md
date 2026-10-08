# tldr

**Understand the terms before you agree.**

[Website, example and pasted-text review](https://terms-tldr.alx21.chatgpt.site) · [Installation guide](docs/INSTALL.md) · [Troubleshooting](docs/TROUBLESHOOTING.md)

tldr connects the terms page you choose in Chrome or Edge to your AI assistant. It supplies source clauses and changes since your last complete review, so your assistant can explain commitments and possible red flags with citations.

**Choose a short pasted-text review on the website, or install the local MCP for browser capture and change tracking.** The optional website review uses GPT-5.4 with your own OpenAI API key and API billing. The local MCP uses your connected assistant and requires no separate model key. The extension is installed from this repository, not a browser store.

## Try a short agreement

Open [Review pasted terms](https://terms-tldr.alx21.chatgpt.site/#review-your-terms), paste the wording, enter your own OpenAI API key, read the hosted review notice and submit. The website explains each source segment, shows qualifications and an exact quotation, and lets you inspect the full original text. It accepts up to 12,000 characters and 24 segments; oversized input is rejected, never silently shortened. Segment labels are reading references, not legal section numbers.

Your complete pasted text and key pass through the site’s server to OpenAI. The app keeps them only in memory and does not save review history. Clear, leaving the page or reloading removes the key and page content. Your API account pays for submitted requests. Canceling stops this page waiting, but OpenAI may already have processed the request. The example remains available without a key or model call.

Coverage and exact-quotation checks detect missing segments and mismatched quotes; **they cannot prove that an explanation preserves the meaning or every exception**. Inspect the original wording. Linked policies are not fetched, earlier versions are not compared, and the website does not advise signing or assess enforceability. Use the local workflow below for page capture and comparison.

## Get started

Download `tldr_1.0.0_source.zip` and `SHA256SUMS` from the [v1 release](https://github.com/agammann/tldr/releases/tag/v1.0.0). Verify its SHA256 before extracting. The source ZIP contains the matching extension in `extension/`. The separate `tldr_1.0.0_extension.zip` contains that same folder for extension upgrades; the local MCP service is still required. See the [v1 support and verification guide](docs/STABILITY.md).

You need **Node.js 24 or later**, **pnpm 11.19.0**, **Chrome or Edge**, and an assistant that supports **local stdio MCP servers**. Codex with Chrome has been verified. Other assistants may use different configuration formats.

1. Get the project and install its dependencies:

   ```sh
   git clone --branch v1.0.0 https://github.com/agammann/tldr.git
   cd tldr
   pnpm install --frozen-lockfile
   ```

   No Git? [Download the v1 source ZIP](https://github.com/agammann/tldr/releases/tag/v1.0.0), extract it, and open a terminal in the folder containing `package.json`. Run the install command there.

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

MCP **1.0.0** · Extension **1.0.0**. The public repository is [agammann/tldr](https://github.com/agammann/tldr). The website retains its original `terms-tldr` address. Existing installation folders and pairing files remain compatible; see [updating an installation](docs/INSTALL.md#updating-an-existing-installation).

The project source is [MIT licensed](LICENSE). Dependency licenses remain with their respective authors; see [third-party notices](THIRD_PARTY_NOTICES.md). The package's `private` flag prevents accidental npm publication; it does not describe GitHub visibility.
