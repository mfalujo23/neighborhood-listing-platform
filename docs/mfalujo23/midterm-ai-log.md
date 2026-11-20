# Midterm AI Journal

| Step / Tool | Prompt Summary | Model Output Used | Model Output Rejected & Rationale | Verification Method | Associated Git Commit |
| --- | --- | --- | --- | --- | --- |
| Codex | Implement the exact Version B services/booking interface and required server helper path on the published backend base. | Mounted services page, runtime response validation, shared booking schema, focus/error/receipt behavior, exact Tailwind grid and server-only compatibility module. | Unchecked casts and async event.currentTarget access could crash the interface. A hidden fictional-data fallback would misrepresent hosted availability. | React DOM keyboard and API tests, followed by exact isolated checks in the verification record. | Backend base 5a51dcb; implementation f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5. |
| Codex | Enforce the four required profile roles while preserving legacy rows. | Fresh exact-role bootstrap and forward NOT VALID CHECK plus narrowed profile insert policy. | Widening the allowed new role list solely for old rows would not meet the requirement; silent data conversion was rejected. | Actual local PostgreSQL fresh/legacy fixtures, preserved rows, idempotence, 42501/23514/empty-result cases. | f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5. |
| Codex | Complete administrator approval and removal of unsafe public offerings. | Strict approved/suspended PATCH after verified administrator authorization. | Provider elevation and arbitrary administrator update fields are rejected before privileged execution. | Synthetic transport tests and real local SQL suspension/RLS checks. | f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5. |

No new ChatGPT, Gemini or Google AI Studio midterm experiment was performed in
this implementation pass. Prior team/model records remain historical; the
separate Lab 1 comparison is not relabeled as a midterm experiment. Student
personal verification and model-specific checkpoints remain pending where
required.


## Post-publication model review

The preceding no-new-experiment statement describes the original implementation checkpoint. The following two matching reviews were actually captured after f4ea7ab was published; they did not execute commands or produce the original implementation. The exact shared [prompt](ai-experiments/midterm/prompt.txt) has SHA256 92b8fc2e9bb053643eb5d1ed68977e3600626401fdc558bb157f87b4d322a8ca. [ChatGPT rendered response](ai-experiments/midterm/chatgpt-critique.json) used UI model Instant, with no exact version exposed. [Gemini rendered response](ai-experiments/midterm/gemini-critique.json) records its actual model/settings. Excerpt-relative model line numbers are not treated as repository line locations.

| Step / Tool | Prompt Summary | Model Output Used | Model Output Rejected & Rationale | Verification Method | Associated Git Commit |
| --- | --- | --- | --- | --- | --- |
| ChatGPT / Instant | Exact linked14850-character source-grounded review prompt. | Profile query outages deserve503; bounded JSON and anonymous route capacity; email contract compatibility. | No provider-verification/future-date business rule was added without requirements. Provider self-registration is a product-policy question, not proven administrator escalation. Mandated draft/suspended edits and cascading foreign keys stay intact. | Actual local API/contract tests, exact SQL/email probe and full combined gate; no provider execution claim. | Reviewed f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5; follow-up commit assigned only after publication. |
| Gemini | Identical linked prompt. | Same concrete outage/resource-limit issues; email mismatch investigated rather than accepted blindly. | The alleged missing trim check already exists in004. Its exclamation-mark email example did not reproduce; apostrophe/percent mismatch did. Strict public-response failure remains intentional instead of silently hiding malformed rows. | Local PostgreSQL/JavaScript comparison plus regression tests. The route limit is per-process and direct PostgREST remains outside that control. | Reviewed f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5; follow-up commit assigned only after publication. |

Required Google AI Studio persistence, personal verification, hosted Auth/cloud application and student defense are not established by these reviews.
