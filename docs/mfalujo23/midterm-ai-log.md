# Midterm AI Journal

| Step / Tool | Prompt Summary | Model Output Used | Model Output Rejected & Rationale | Verification Method | Associated Git Commit |
| --- | --- | --- | --- | --- | --- |
| Codex | Implement the exact Version B services/booking interface and required server helper path on the published backend base. | Mounted services page, runtime response validation, shared booking schema, focus/error/receipt behavior, exact Tailwind grid and server-only compatibility module. | Unchecked casts and async event.currentTarget access could crash the interface. A hidden fictional-data fallback would misrepresent hosted availability. | React DOM keyboard and API tests, followed by exact isolated checks in the verification record. | Backend base 5a51dcb; new examination commit pending publication. |
| Codex | Enforce the four required profile roles while preserving legacy rows. | Fresh exact-role bootstrap and forward NOT VALID CHECK plus narrowed profile insert policy. | Widening the allowed new role list solely for old rows would not meet the requirement; silent data conversion was rejected. | Actual local PostgreSQL fresh/legacy fixtures, preserved rows, idempotence, 42501/23514/empty-result cases. | New examination commit pending publication. |
| Codex | Complete administrator approval and removal of unsafe public offerings. | Strict approved/suspended PATCH after verified administrator authorization. | Provider elevation and arbitrary administrator update fields are rejected before privileged execution. | Synthetic transport tests and real local SQL suspension/RLS checks. | New examination commit pending publication. |

No new ChatGPT, Gemini or Google AI Studio midterm experiment was performed in
this implementation pass. Prior team/model records remain historical; the
separate Lab 1 comparison is not relabeled as a midterm experiment. Student
personal verification and model-specific checkpoints remain pending where
required.
