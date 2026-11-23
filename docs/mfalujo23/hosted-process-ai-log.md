# Michael Falujo — Hosted reproduction AI process

Date: November 19, 2026.

| Step / Tool | Prompt Summary | Model Output Used | Model Output Rejected & Rationale | Verification Method | Associated Git Commit |
| --- | --- | --- | --- | --- | --- |
| Codex; exact model version not exposed | Prepare applied SQL, nonsecret results and merchant-policy reconciliation for reproduction. Preserve original results and private inputs. | Exact SQL copies/hashes, allowlisted summaries, setup guide, merchant policy and local regression runner. | Private inputs, altered results and unperformed provider/human/rollback claims excluded. | All 619 base files/tree matched 9429; SQL hashes/links checked;35 local PostgreSQL checks passed. [Result](hosted-evidence/merchant-policy-local.json). | Actual input: [9429aea](https://github.com/mfalujo23/neighborhood-listing-platform/commit/9429aeaef638f7714cfcd9df3e6e66c84ea8b0b0). This change adds reproduction files and the merchant-policy migration. |

The [index](hosted-evidence/index.json) preserves each earlier execution's source
and input hash. Summarizing did not repeat those runs. The new policy regression
ran locally without hosted requests. The separate booking verifier made only
read requests around the browser submission. No additional ChatGPT, Gemini or
AI Studio experiment, student explanation or human UAT was performed.
