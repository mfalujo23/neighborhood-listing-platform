# Services and bookings follow-up

The published exam used a generic JavaScript email validator that differed from the required PostgreSQL email CHECK, treated profile-query outages as403 role denial, and parsed unbounded JSON before validation. This follow-up aligns email syntax, separates profile503 outages from42501/403 denial on the three affected routes, bounds application/json bodies to 16KiB, and gives anonymous booking requests a per-process 30-per-60-second capacity guard with 429 and Retry-After. Authenticated administrator PATCH shares the bounded reader after verification. A publishable key in the privileged environment slot is rejected before client construction.

The existing strict contracts, verified role/ownership checks, private booking receipt, exact five-table exam schema and fresh/legacy role rules remain unchanged. No district taxonomy, Auth account-deactivation flow or new business rule is inferred from the narrative. No new analytics, media, voice, sponsor or release-feature imports are included.

## Actual verification

- Exact existing package-lock clean install, strict lint with zero warnings and TypeScript: passed.
- 117 unit tests across 9 files and 19 webhook regression tests: passed.
- 45 backend and 50 midterm actual local PostgreSQL checks: passed.
- Four email cases used actual anonymous INSERTs into the migrated bookings table, rolled back individually; runtime acceptance matched SQL. Percent/plus accepted; apostrophe/exclamation rejected by the mandated CHECK.
- Production Next build: passed with compiler subprocess access. Inherited unused legacy Redis warnings remain outside this exam change.
- 47 production loopback HTTP checks passed, including 30 private 201 receipts then 429/Retry-After, supported email 201, unsupported email 400, malformed 400, actual oversize 413, media type 415 and profile 503/403 on all three affected routes.

Exact results, raw HTTP responses, process logs and command outcomes are under [exam-followup-evidence](exam-followup-evidence/commands.json). The fake Auth/profile transport is explicit local test scaffolding. PostgreSQL is disposable and fictional; no hosted Auth/PostgREST, cloud migration, real customer interaction or provider request is certified. Capacity is per process only and does not govern direct database API requests. An initial restricted compile failure and the initial 5-second HTTP test timeout are preserved in the working evidence; the successful production build and bounded 20-second HTTP run are identified separately.

[Actual matching midterm model reviews](midterm-ai-log.md#post-publication-model-review) remain preserved, with used/rejected findings and their limits. The coordinator assigns the actual follow-up commit after publication.
