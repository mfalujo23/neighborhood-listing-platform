# Labs 13–14 AI log — mfalujo23

Date: 2026-11-18. Tool actually used: Codex. Outputs were created by a Codex agent and are disclosed as AI-assisted. This does not assert that the student personally ran the checks, that a participant was interviewed, that a stakeholder approved a change, or that ChatGPT/Gemini/AI Studio were used for the required external comparisons.

## Prompt/objective used in this session

Inspect exact Labs 13/14 and their audit requirements, implement useful locally testable dashboard/telemetry work, use clearly fictional mock mode, minimize data, default consent/collection off, validate strict shapes, handle duplicates and safe empty/error states, preserve teammates, and record only actual evidence. Do not invent UAT observations, student interviews, provider timing, personal data or approvals.

Useful outputs: a discriminated nine-event schema; event-ID idempotence and conflict detection; normalized SQL columns with RLS; distinct matched-impression CTR; same-window cohort definitions; explicit insufficient-data denominators; fixed fictional latency separate from live measurements; accessible daily counts/table; opt-in/revoke/delete interactions; and six neutral UAT tasks with a proposed consent script and blank traceability header.

Rejected approaches: IP/user-agent hashes for deduplication, full transcripts/recordings, contact or caller identity, a public unauthenticated dashboard of actual rows, client-supplied role authorization, silently truncated counts, first-call-resolution claims without caller history, proxy/model/provider latency claims from local fixture numbers, and invented live observations/issues/commit evidence. A client-supplied event cannot claim a provider-measured source through this fixture endpoint.

Code review identified further edge cases and added regressions: a failed authorization must clear earlier verified state; an internal principal argument must not elevate the verified role; and latest completion selection must remain deterministic for out-of-order callbacks. Exact tests and raw outputs are preserved with this scope. Initial TypeScript inference and React lint failures were corrected rather than labeled passing.

## Actual verification

Codex ran local unit tests for event minimization, default-off collection, revocation, duplicate/conflicting IDs, source separation, UTC midnight/offsets, denominator counts, chart tables, HTTP authorization/validation and mocked Supabase role checks. The PostgreSQL runner actually applied migration00600 to a disposable PGlite database with fictional users/properties/events, verified permissions/owner scoping, CTR2/4=50%, unique keys, shape constraints, retention and idempotent migration reapplication. Exact counts and pass totals are in the evidence files; local auth stubs are not a real hosted authorization session.

The public browser demonstration, if verified by the coordinating agent, is documented separately and is not an empirical user session. No real provider, telephony request, SMS, raw transcript, production account or cloud database was used by this agent. Publication and any deployment are owned by the coordinator; this agent created no commit, PR, third-party message or Canvas submission.

## Required comparisons and UAT not yet performed

Lab 13 requires actual de-identified observations before AI Studio grouping. There are currently no observations to group. The blank CSV has no participant rows. Suggested prompt after a consented session:

> Group these de-identified UAT observations into themes. Preserve observation IDs, distinguish behavior from interpretation, flag contradictions, and do not invent frequency or stakeholder intent. Do not infer a business-rule change; mark it needs decision.

Lab 14 requires an actual ChatGPT/Gemini chart recommendation comparison. It remains pending. Use the same public-data-only prompt for both tools, retain actual outputs, verify denominator claims, and record the eventual commit:

> Review this analytics plan for decision usefulness, denominator errors, duplicate events, privacy overcollection, misleading small samples and accessibility. Recommend the minimum viable metric set and one chart supporting a stated operational decision. Use the attached fictional fixture only. Do not invent user behavior or provider measurements.

Compare technical correctness, data minimization, accessible alternatives and the actual decision supported. The current daily bar/table choice is a Codex implementation decision; it is not attributed to either required external tool. Live UAT, stakeholder approval/disposition, real issue/fixing commit links and the student's individual reflection must be recorded truthfully after they occur.
