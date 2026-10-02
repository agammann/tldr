# Privacy and limitations

[Back to the README](../README.md)

## Where text goes

The extension captures rendered page text or a selection when you click it. It sends the snapshot and candidate policy links to the MCP on your computer. It does not transmit browser cookies or read form input values, but visible page text can still contain personal information.

Your connected assistant receives source text when it invokes a review tool. Its data policies apply. Running the MCP locally does not mean the assistant's model runs locally. Public URL review contacts the requested website without account cookies or login credentials. The MCP and extension implement no telemetry or analytics.

The public website contains a predefined example, guide and optional pasted-text review. Its example makes no model requests. A hosted review requires your own OpenAI API key and an explicit submission. The complete pasted text and key pass through the same-origin website server to OpenAI’s Responses API, using GPT-5.4. The app does not persist the key, terms or review or use an owner credential. It requests `store: false`; OpenAI’s API data policies still apply. Your API account is billed for requests, including ones OpenAI may have processed before you cancel.

The website keeps its draft, key and result in page memory. Clear, reload and leaving the page erase them, including a back/forward cache return. There is no account or review history for this mode. Do not paste text you are not comfortable sending through the hosting service and OpenAI. The site loads fonts from Google Fonts; normal hosting and font requests are separate from a model request.

Hosted input is limited to 12,000 characters and 24 source segments. All submitted characters are included; paragraph boundaries and long-text reading breaks determine segment labels, which are not legal section numbers. Larger input is rejected before a provider call. No server-side URL fetching, linked policy retrieval or baseline comparison occurs. The response must explain each supplied segment in order and include an exact quote from it; missing coverage and invalid quotes are rejected. These structural checks cannot establish semantic accuracy, preservation of every exception or completeness of the entire agreement. Read the full original text alongside every explanation.

## Local storage

| Data | Location and lifetime |
| :--- | :--- |
| Latest browser capture | Memory in the process owning the bridge, until replaced or that process exits. |
| Paged review records | Memory in the reviewing process; up to eight records, expiring after 20 minutes. |
| Saved baselines | Plaintext `.local/history.json`; the latest complete reviewed copy for up to 30 URLs. |
| Browser pairing | `.local/pairing.json` and extension local storage, restricted to trusted extension contexts. |

URL keys include query strings, which may contain account information. `.local` and machine specific `mcp-config.json` are ignored by Git. Do not share those files in screenshots, issues or archives.

The bridge listens on `127.0.0.1:43187` by default, requires the pairing token, checks the HTTP Host and rejects ordinary website Origins. An explicitly configured port still uses the literal loopback address; remote hosts are rejected by the extension's pairing validation. Sessions with the same pairing can read the same latest capture. Different pairings cannot. If the owner exits, a later review can start a replacement bridge, but the lost snapshot must be captured again.

See [resetting local data](TROUBLESHOOTING.md#resetting-local-data) to erase history or reset pairing.

## Coverage

Public URL fetching supports static UTF8 HTML and plain text. It limits responses to 1 MiB, extracted text to 160,000 characters, requests to 15 seconds and redirects to three. Destinations are validated and DNS results are pinned for each request.

Browser captures over 160,000 characters are marked partial. Selected text is also partial; neither overwrites a full baseline. Captures can include navigation and footer content. Linked policies are listed but are not automatically fetched.

PDF extraction, OCR, inaccessible frames, shadow DOM capture and automated interaction with agreements are outside this version. Dynamic or authenticated terms may be reviewed by opening them and capturing rendered text, but support is not universal.

Source text may contain malicious instructions. Server guidance tells the assistant to treat it as evidence; this does not guarantee protection from model prompt injection. The assistant can miss or misinterpret provisions. Citations support inspection, not a guarantee of legal accuracy, enforceability or suitability for your location and plan.
