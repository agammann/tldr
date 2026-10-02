# tldr website

[Visit tldr](https://terms-tldr.alx21.chatgpt.site).

Source for the public example, installation guide and optional pasted-text review on OpenAI Sites. The example agreement, review and comparison are fictional and predefined. The optional review requires the visitor’s own OpenAI API key; the Worker accepts no owner key or environment fallback.

From the repository root, run `pnpm build:website`, then `pnpm preview:website` and open `http://127.0.0.1:5192`. The dependency-free build writes `website/dist/server/index.js` with an explicit list of public assets and the existing Sites project metadata. No source directory, environment file or test fixture is exposed. `pnpm test` includes the hosted route and source-contract tests without calling OpenAI.

The page sends a single manual request to `/api/review/visitor`, which calls only OpenAI’s Responses API with GPT-5.4 and `store: false`. Input limits are 12,000 characters and 24 segments; source text is never silently truncated. Output coverage and quotes are validated, but model explanations still require human inspection. See [privacy and limitations](../docs/PRIVACY_AND_LIMITS.md).

Website changes must also be published to the existing Sites project. Updating these GitHub files alone does not deploy the site.
