# Lab 6 AI collaboration log — mfalujo23

Date: 2026-11-18. Tool actually used: Codex. Work was performed by a Codex agent with an independent backend agent executing/reviewing the SQL. This log does not claim student-executed tests, partner contributions, ChatGPT website use, Gemini use, hosted SQL execution or legal/accessibility certification.

## Objective and critique

The authorized scope was to inspect the existing sponsor engine, preserve public usage, implement deterministic approved/active/placement/date/ZIP-or-radius rules, validate redirects against approved records, add disclosure/coarse-event evidence, and reproduce Audit 6 without real external clicks or cloud writes.

Adversarial review objective used in this Codex session: examine boundary dates and ZIP+4, missing distances, inactive/pending high-tier records, tier/distance/impression/ID ties, unsafe stored URLs, client destination injection, duplicate query parameters, coarse-event data leakage and historical UUID/TEXT database compatibility. No individualized or sensitive housing targeting was proposed.

Useful findings accepted: preserve C over B because distance precedes impressions; exclude D before ranking; require a real distance instead of manufacturing a huge one; validate stored URLs both before selection and at click time; scope the public SQL query itself by property/geography; replace permissive owner self-approval policies; label unpaid house content; default impression writes off and reject extra fields. The backend agent caught historical TEXT sponsor IDs and `company_name NOT NULL`; the forward migration and fixture were adjusted without rewriting real rows.

Rejected approaches: random/weighted rotation without a recorded seed, profile-based targeting, trusting a client destination URL, broad anonymous sponsor SELECT, silently casting stored IDs, backfilling approval or campaign dates, treating impressions as confirmed human views, and claiming compliance from static JSX. No real sponsor URL was followed.

## Verification actually run

Codex ran the focused four-file Vitest suite: 58 tests passed. It ran strict scoped ESLint with zero warnings and repository `tsc --noEmit` successfully. The static evidence script executed actual pure selection, URL validation, Web Response objects and React static markup locally; it selected C, returned exact/nearby/house outcomes and produced the documented unsafe-URL 502 error. Database access in the action tests was mocked. Exact command output is preserved under `evidence/` and the working evidence folder.

The independent backend agent actually executed the migration/fixture under local PostgreSQL in PGlite for UUID and historical sponsor-TEXT/required-company-name schemas; property IDs remain UUID. Both produced C, B, A with pending D excluded; anonymous direct SELECT/event RPC were denied; a service-only coarse event and counter increment were observed and rolled back. Owner draft writes passed, owner approval/activation/transfer attempts failed, another owner's access was absent, and administrator approval succeeded. The migration was reapplied without data change. Exact raw checks and outer/inner EXPLAIN plans are in `backend-evidence/local-sponsor-results.json`. These runs use synthetic local identities and auth stubs; a successful local harness is not a claim that a cloud migration was applied. Browser verification, if added by the coordinating agent, is attributed to that agent separately.

## Required human/tool steps not invented

The assignment explicitly asks for ChatGPT and Gemini critique and role/attribution evidence. Neither required external tool run is established by this Codex log. Suggested public-data-only prompt for those runs:

> Act as an adversarial tester for this contextual sponsor-selection function. Generate boundary cases involving dates, ZIP codes, empty data, ties, unapproved records, and unsafe URLs. Do not propose user profiling. Review the attached fictional fixture and source only. Identify a concrete failing example before proposing a change.

Record each actual tool's prompt/output, useful/rejected findings, independently verified result and resulting commit when those reviews occur. The user reports instructor permission to work solo; this agent has not invented a teammate review or participation. Git commit/PR links will be recorded by the publishing coordinator after publication; no commit was created by this agent.
