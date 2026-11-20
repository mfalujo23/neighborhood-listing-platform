# Security and accessibility review prompts

- [Exact consolidated prompt](../artifacts/consolidated/exact-prompt.txt)
- [Actual delivered three-part text](../artifacts/consolidated/actual-parts.json)
- [Source excerpt index](../artifacts/consolidated/source-index.json)
- [Gemini response](../artifacts/consolidated/gemini-review.raw.json)
- [ChatGPT response](../artifacts/consolidated/chatgpt-review.raw.json)

Both reviews use the same source bundle and are static critiques. Neither model executed tests. The separate checks include actual source gates, local role tests, safe HTTP attacks, redacted scanning and real rendered axe. Missing excerpt context is not treated as proof that code is absent.

Earlier scanner task summary (the exact original full task was not retained here): use an official pinned checksum-verified Gitleaks release with redaction100/default rules, inspect reachable history and selected source/client files, stop on findings, and classify only safe metadata without values/provider validation or suppression. The later classification refinement distinguishes public-client values from generated build keys. This summary is not presented as a new provider prompt or an executed model comparison.
