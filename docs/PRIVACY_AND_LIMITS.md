# Privacy and limitations

[Back to the README](../README.md)

## Where text goes

The extension captures rendered page text or a selection when you click it. It sends the snapshot and candidate policy links to the MCP on your computer. It does not transmit browser cookies or read form input values, but visible page text can still contain personal information.

Your connected assistant receives source text when it invokes a review tool. Its data policies apply. Running the MCP locally does not mean the assistant's model runs locally. Public URL review contacts the requested website without account cookies or login credentials. The MCP and extension implement no telemetry or analytics.

The public website contains a predefined example and guide. It has no terms submission form and makes no AI requests. It loads fonts from Google Fonts; normal hosting and font requests are separate from the local review workflow.

## Local storage

| Data | Location and lifetime |
| :--- | :--- |
| Latest browser capture | Memory in the process owning the bridge, until replaced or that process exits. |
| Paged review records | Memory in the reviewing process; up to eight records, expiring after 20 minutes. |
| Saved baselines | Plaintext `.local/history.json`; the latest complete reviewed copy for up to 30 URLs. |
| Browser pairing | `.local/pairing.json` and extension local storage, restricted to trusted extension contexts. |

URL keys include query strings, which may contain account information. `.local` and machine specific `mcp-config.json` are ignored by Git. Do not share those files in screenshots, issues or archives.

The bridge listens on `127.0.0.1:43187`, requires the pairing token, checks the HTTP Host and rejects ordinary website Origins. Sessions with the same pairing can read the same latest capture. Different pairings cannot. If the owner exits, a later review can start a replacement bridge, but the lost snapshot must be captured again.

See [resetting local data](TROUBLESHOOTING.md#resetting-local-data) to erase history or reset pairing.

## Coverage

Public URL fetching supports static UTF8 HTML and plain text. It limits responses to 1 MiB, extracted text to 160,000 characters, requests to 15 seconds and redirects to three. Destinations are validated and DNS results are pinned for each request.

Browser captures over 160,000 characters are marked partial. Selected text is also partial; neither overwrites a full baseline. Captures can include navigation and footer content. Linked policies are listed but are not automatically fetched.

PDF extraction, OCR, inaccessible frames, shadow DOM capture and automated interaction with agreements are outside this version. Dynamic or authenticated terms may be reviewed by opening them and capturing rendered text, but support is not universal.

Source text may contain malicious instructions. Server guidance tells the assistant to treat it as evidence; this does not guarantee protection from model prompt injection. The assistant can miss or misinterpret provisions. Citations support inspection, not a guarantee of legal accuracy, enforceability or suitability for your location and plan.
