# Backend AI-assistance record - mfalujo23

Date: 2026-11-18. Tool: Codex. Associated new commit/PR: pending publication by
the parent task. No earlier teammate commit or log is attributed to this account.

| Request / prompt summary | Output accepted | Output rejected or qualified | Actual verification |
| --- | --- | --- | --- |
| Inspect Lab5/midterm schema and routes; repair auth/RLS without real secrets or cloud writes. | Forward migration restoring services/bookings, strict service payload, role-bound drafts, private booking receipt, sanitized failures. | Replaying the historical remote export would drop application tables. It was not executed. | Inspected actual migration/route files and observed assignment specifications. |
| Produce genuine local PostgreSQL role evidence. | Official dev-only PGlite package, disposable databases, explicit local-only auth bootstrap, fictional fixtures, assertion-based SQL runner. | A JavaScript mock alone cannot establish RLS. Supabase Auth/PostgREST/hosted execution and concurrency are not inferred from local SQL. | Real PostgreSQL18.6 role switch, filtered rows, 42501 and23514 results, fresh apply and data-preserving reapplication. |
| Repair permissive policy conflicts. | Replace policies only on the six owned backend tables. USING and WITH CHECK prevent owner self-approval. | Keeping an old owner-only permissive policy would OR around the restriction. Existing records were not deleted or silently approved. | The local legacy fixture first reproduced actual bypasses, then verified their denial after migration. |
| Verify service/booking HTTP guards safely. | Unit tests with an explicitly mocked Supabase transport and synthetic session identity, plus separate actual SQL verification. | No real provider calls, credentials, client records, or claims of successful cloud authentication. | Missing/expired-session401, client403, malformed/extra payload400, provider/merchant draft binding201, private booking receipt. |

No separate ChatGPT-versus-Gemini comparison or Google AI Studio session was
performed during this remediation. No student manual testing or peer review has
been invented. The student still needs to review, understand, and defend the
artifacts. All verification here is automated Codex work.
