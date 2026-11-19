# Michael Falujo — Database reproduction and results

The isolated course database contains managed Auth, six core tables and five
optional tables. Application data is fictional. The
[evidence index](hosted-evidence/index.json) records retained result hashes.
Summaries exclude credentials, contacts and actual Auth IDs.

| Check | Source | Result | Scope |
| --- | --- | --- | --- |
| [Auth and core RLS](hosted-evidence/core-auth.json) | cca10f4 | 40 passed; five managed sign-ins/getUser checks | Original six-table seed and guarded role tests |
| [Optional objects](hosted-evidence/addons.json) | ea73cfd | 49 passed; no inserted/deleted rows or write RPCs | Hosted SDK permissions and read RPCs |
| [Booking route](hosted-evidence/booking-http.json) | ea73cfd | 16 passed; exact five-column GET and one verified HTTP201 booking | Local production Next backed by hosted Supabase; row preserved |
| [Callback](hosted-evidence/callback-http.json) | ea73cfd | Seven passed; approved property facts and C/B/A sponsor reads | Local production Next backed by hosted Supabase; synthetic envelopes |
| [Browser session](hosted-evidence/browser-auth.json) | 3384e88 | Seven sign-in, reload, sign-out and denial observations | In-app browser against hosted Auth; not human UAT or a zoom check |
| [Public booking verification](hosted-evidence/index.json) | 9429aea | Bookings 2→3; one exact fictional addition | Read-only comparison around one separately performed browser submission |
| [Public callback](hosted-evidence/index.json) | 9429aea | Seven passed; exact health source verified | Public deployment with synthetic envelopes; all six core tables unchanged at three bookings |

The callback follow-up returned HTTP 200 with `UNAVAILABLE` and stated that no
request, call or message was submitted. It made zero database fetches. Positive
controls recorded two property reads and one sponsor RPC in the local callback
run; bookings remained two. The later public smoke preserved three bookings.
Remote database fetch counters were not instrumented. Neither run was a
provider-issued call. The table keeps each execution's actual source.

## Setup order

The [SQL inventory](../../supabase/cloud/classroom/source-manifest.json) lists
exact copied hashes. These guarded files are for the approved fresh course
project. Do not replay the remote-schema export or all historical migrations.

1. Confirm the authorized new project. Run
   [01-preflight.sql](../../supabase/cloud/classroom/01-preflight.sql): managed
   Auth/roles must exist and public must have zero application relations.
2. Run [02-fresh-core.sql](../../supabase/cloud/classroom/02-fresh-core.sql) once,
   then [03-schema-audit.sql](../../supabase/cloud/classroom/03-schema-audit.sql).
   Existing relations cause an atomic SQLSTATE 55000 stop. Cloud SQL has no
   Auth stand-ins or direct Auth user inserts.
3. Create the five managed fictional accounts named in
   [04-fictional-seed.sql](../../supabase/cloud/classroom/04-fictional-seed.sql)
   with private passwords, without invitation/reset messages. Apply 04 only with
   empty application tables. It resolves managed IDs and creates protected
   profiles. Verify sign-in/getUser and core RLS before optional objects.
4. Review and apply [10-sponsors.sql](../../supabase/cloud/classroom/10-sponsors.sql),
   [20-analytics.sql](../../supabase/cloud/classroom/20-analytics.sql), then
   [30-telephony.sql](../../supabase/cloud/classroom/30-telephony.sql).
   Each transaction requires the original one-booking seed dated
   **November 19, 2026 UTC** and rejects existing target objects. A different target
   or seed date needs a separately reviewed rendering. Campaign windows expire.
   Do not change guards to accept unexpected data or rerun original-seed checks
   after new bookings.
5. Inspect [40-catalog-audit.sql](../../supabase/cloud/classroom/40-catalog-audit.sql)
   and [42-function-grants.sql](../../supabase/cloud/classroom/42-function-grants.sql),
   then test SDK permissions. All 11 observed tables had RLS. Anonymous callers
   used the narrow sponsor RPC, not direct optional-table reads. Analytics reads
   used authenticated RLS; purge/impression recording were service-only.
   OpenAPI's 17-path inventory is not effective-grant evidence.
6. Configure `.env.example` values privately. Public paths use the URL/publishable
   key; privileged keys stay on trusted server paths. Use Node 24, npm 11.21.3,
   `npm ci`, then `npm run verify:source`. This gate is separate from hosted
   verification. Fixture analytics needs `ENABLE_ANALYTICS=true` and
   `ANALYTICS_FIXTURE_MODE=true`; fixture events are not provider telemetry.
7. Run bounded booking checks after optional installation. The route check
   preserved one new row; the later public browser check preserved one more.
   Configure `VAPI_ASSISTANT_ID` and dedicated `VAPI_SERVER_TOKEN` for callbacks.
   Missing follow-up transport stays unavailable. Provider delivery and human
   UAT require separate results.

## Merchant policy

The [forward migration](../../supabase/migrations/20261119000200_sponsor_merchant_draft_permissions.sql)
reconciles 005's generic owner/admin browser policies with the merchant guard
already installed inside the sponsor bundle. Protected merchant owners can read
their campaigns and create/edit pending inactive drafts. Other browser roles
cannot write sponsor drafts; an admin browser has no approval bypass.

The migration preserves rows/RPC bodies, is idempotent for the reviewed schema,
and stops with 55000 for unknown policies. It has not been separately executed
hosted. Run `node scripts/verify-merchant-sponsor-permissions.mjs` for the
[35 local PostgreSQL checks](hosted-evidence/merchant-policy-local.json).
Auth stand-ins exist only in that disposable local verification.

## Recovery

Failed uncommitted bootstrap transactions roll back atomically.
[90-containment.sql](../../supabase/cloud/classroom/90-containment.sql) is an
unexecuted permission-revocation option that preserves data and Auth accounts.
Re-enabling needs a reviewed forward permission change.

The [application rollback](hosted-evidence/index.json) promoted the existing
d0db83a production build, then restored9429aea. The old/new public home and
restored health source were observed. A separate six-read comparison confirmed
all six core tables unchanged, with three bookings preserved. No SQL rollback,
backup restore, RPO/RTO or call continuity was measured.

[AI process record](hosted-process-ai-log.md).
