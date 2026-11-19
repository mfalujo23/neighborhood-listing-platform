# Database and row-level security

## Original problem
Service drafts and private bookings needed constraints, verified identities, protected role assignment and owner-scoped access while preserving historical data.

## Initial prompt
Exact post-implementation review prompt retained
- [Original source](../../docs/mfalujo23/ai-experiments/midterm/prompt.txt).

## AI response summary
Gemini and ChatGPT critiqued the already-published Version B service/booking implementation. They discussed Auth versus RLS, provider-registration policy, public-booking abuse, contract parity, outages and the difference between local and hosted evidence.

## Recorded technical critique
Removing suspended-service edits or replacing booking CASCADE with RESTRICT would contradict explicit exam requirements. Numeric coercion/partial filtering would weaken the strict public-data boundary. Provider self-registration is a product policy question, not proven admin escalation; actual grants/tests block browser-created administrator identity. A claimed missing trimmed-notes check was false; actual email parity probes identified a different mismatch.

## Revised prompt / actual revision status
Follow-up implementation task, not a second provider response
Use actual tests to separate profile outage 503 from forbidden roles, bound JSON and booking capacity, and align the observed SQL/JavaScript email contract. Follow-up source must be pinned to its later published commit.

## Final result
Published backend and exam snapshots contain strict session-bound provider drafts, receipt-only anonymous booking creation, exact four-role fresh schema and forward constraints preserving legacy rows. Later accepted critique fixes are separately tested; they are not attributed to the earlier implementation commit.

## Verification evidence
- 45 actual local backend PostgreSQL cases
- 50 actual fresh/legacy midterm PostgreSQL cases, with raw 42501, 23514 and empty-row results
- Earlier midterm browser/API/keyboard evidence uses fictional local transport; later hosted evidence is recorded separately
- Four real local email-character parity probes and later request-control tests; [exam follow-up source](https://github.com/mfalujo23/neighborhood-listing-platform/commit/d6c3b3f93afd5b263d199bdcd70868535cb93103) records the later isolated checks

Later real managed-Auth/role, public booking and deployment checks are in the [hosted reproduction record](../../docs/mfalujo23/hosted-reproduction.md). They do not relabel the earlier local tests.

## Related GitHub work
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/pull/9)
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/pull/11)
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/commit/f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5)

## My decision and lesson

I would retain separate controls for validated input, verified identity, database grants and row-level security. I would reject removing the examination's required suspended-service owner edits or changing its required cascading relationship merely because a critique preferred another design. I would also reject the claim that a trimmed-notes check was missing when the SQL already contained it.

The property API and RLS repairs are useful, but the current listings page still reads saved JSON. The older migration defines inquiries, while the approved fresh hosted rollout omits that table. I would close those exact Lab 5 integration gaps rather than present service-booking tests as proof of the whole listings flow. Local fixtures, hosted role checks and public UI persistence must retain their distinct evidence scopes.
