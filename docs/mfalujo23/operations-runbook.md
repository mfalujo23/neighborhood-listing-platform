# Michael Falujo — Operations and Disaster Recovery

## Installation and provisioning

Runtime: Node.js 24.22.3, npm 11.21.3, Next.js 16.4.6, PGlite 0.5.16 for disposable local PostgreSQL verification. Production uses managed Supabase PostgreSQL and Auth; no hosted database has been provisioned or verified by these local commands.

```powershell
git clone https://github.com/mfalujo23/neighborhood-listing-platform.git
Set-Location neighborhood-listing-platform
git checkout <reviewed-release-commit>
npm --version # must report 11.21.3
npm ci --ignore-scripts
npm run verify:source
```

The sanitized variable inventory is [`.env.example`](../../.env.example). Values are blank or default off. Copy it to ignored `.env.local` only after source verification, and set values through the deployment owner's secret manager. `SUPABASE_SERVICE_ROLE_KEY` is server only; a known `sb_publishable_` value in this variable is rejected. A publishable key belongs only in the public client variable. Never paste actual keys into reports, prompts, test fixtures, CI output, or Git history. Vapi and Google AI keys are optional future-provider settings; the text voice simulator makes no provider requests.

Fresh hosted setup requires an empty, owner-approved project and managed Supabase Auth. Review `supabase/migrations/20261029140000_exam_services_persistence.sql`, the forward `20261118000400_restore_backend_contracts_rls.sql`, and `20261118000700_midterm_profile_roles.sql`. The cloud-ready, transaction-guarded script in `midterm-evidence/fresh-supabase-bootstrap.sql` refuses existing application tables with `FRESH_MIDTERM_PROJECT_REQUIRED`. It contains no local Auth stubs. Apply it using the project's SQL editor or an owner-provided connection only after approval. Do not blindly execute the older remote-schema export: it drops application tables. Sponsor, analytics, media-record, and telephony migrations require separate schema reconciliation and review; their disposable local runners establish their supported baselines, not a universal hosted upgrade path.

Reproduce fictional property/sponsor setup without a cloud account:

```powershell
node scripts/verify-local-backend.mjs
node scripts/verify-local-midterm.mjs
node scripts/verify-local-sponsors.mjs
node scripts/verify-local-analytics.mjs
node scripts/verify-local-analytics-provider.mjs
node scripts/verify-mfalujo23-media-records.mjs
```

Each runner creates disposable PostgreSQL, loads controlled local Auth/role fixtures, applies the selected actual SQL, and asserts expected rows/errors. Local `auth.uid()` stubs must never be applied to hosted Supabase. Fictional fixtures are not a production seed approval. Keep the authored UUID-property-ID requirement distinct from supported legacy sponsor TEXT IDs.

## Steady-state checks

```powershell
npm run build
npm start -- --hostname 127.0.0.1 --port 3000
curl.exe --fail-with-body http://127.0.0.1:3000/api/health
node scripts/smoke-deployment.mjs --base http://127.0.0.1:3000 --commit local --application-only
# Full hosted check, after an approved deployment and fictional approved service seed:
node scripts/smoke-deployment.mjs --base https://<production-host> --commit <40-character-source-sha>
```

The health response contract is:

```json
{"status":"ok","level":"liveness","service":"neighborhood-listing-platform","commit":"local","checks":{"application":"running","database":"not_checked","voice_provider":"not_checked"}}
```

The actual loopback GET200 capture is `release-evidence/health-http.log`, with this payload and the production response headers. It is not hosted evidence. The actual smoke result is saved in `release-evidence/deployment-smoke.json` when the command executes. Liveness does not prove database availability or carrier health. Check Supabase database/API/Auth logs in the approved project; use an authenticated, nonprivileged synthetic role test for readiness. Inspect webhook coarse status logs without request bodies, signatures, raw phone numbers, transcripts, or secrets. There is no separately deployed ingestion worker: `/api/webhooks/voice` handles synchronous requests. Valid processing failures return generic unavailable TwiML with Hangup and no business acceptance; alert on `processing_unavailable` even though the carrier-facing status is HTTP 200. `/api/webhooks/twilio` is retired with HTTP 410.

## End-to-end source verification

```powershell
npm test
npm run verify:source
```

`npm test` runs component/runtime tests, webhook tests, backend and midterm RLS, sponsor eligibility/RLS on UUID and TEXT sponsor baselines, minimized analytics plus canonical/legacy role isolation, media approval records, and a real fictional local restore with restored RLS. It fails on the first nonzero child exit and records exact commands/results in `release-evidence/combined-tests.json`. It refuses private `.env*` files without reading their values and strips provider settings from child environments. CI executes locked installation, strict lint, types, this combined test command, and production build with read-only repository permissions. A local test pass is not a hosted Auth, human UAT, or carrier-call result.

`npm run verify:source` additionally checks the built booking API against a separate disposable local PostgreSQL fixture: 30 synthetic requests must return HTTP 201 and request 31 must return HTTP 429 with a positive Retry-After header. `node scripts/verify-booking-http-capacity.mjs` reproduces that check after building. It refuses occupied ports 3004/54326 and private environment files, strips provider variables, and stops its two child processes. Evidence is saved under `release-evidence/booking-capacity`. No real contact or cloud project is used; the process-local limit does not protect direct PostgREST writes.

Build once with `ENABLE_LOCAL_ACCESSIBILITY_AUDIT=true` for a controlled preview. On each route, use the visible **Run accessibility checks** button and save its sanitized axe JSON. Run `node scripts/verify-accessibility-evidence.mjs <report1.json> <report2.json>`: any malformed report, zero executed rules, violation or incomplete item exits1. Perform keyboard, focus, zoom and screen-reader review separately. The control is off by default. It does not make this app WCAG-certified. The unit test mocks axe and cannot substitute for running the real engine on a rendered page.

## Disaster recovery

1. Freeze application writes and callback dispatch. Record incident time, source commit, managed project, backup timestamp, migration level, and owners. Do not print connection strings.
2. In the managed project's backup dashboard, verify that the expected backup exists and whether the paid plan actually includes daily backups or PITR. No hosted backup schedule, PITR entitlement, RPO, or RTO has been established here.
3. Prefer restoration into a separately approved recovery project. Restore managed Auth, extensions, roles and application data according to the provider's documented procedure; do not overwrite production using local Auth fixtures. For a PostgreSQL custom-format dump obtained through the approved backup process, inspect its contents first with `pg_restore --list <approved-backup.dump>`, then restore to the empty recovery database using `pg_restore --exit-on-error --no-owner --dbname=$env:RECOVERY_DATABASE_URL <approved-backup.dump>`. A plain SQL dump instead requires `psql --set ON_ERROR_STOP=on --dbname=$env:RECOVERY_DATABASE_URL --file <approved-backup.sql>`. Credentials stay in the process environment.
4. Verify table counts, critical constraints, migration versions, public approved reads, denied unapproved reads, owner edits, other-owner denial, protected-role administration and booking privacy. Repeat the synthetic role matrix against the recovery project using actual test accounts, and run full smoke/flow checks before changing host settings or traffic.
5. Restore storage objects separately if required; a database backup is not proof that stored image files exist. Reconcile external callback configuration and preserve idempotency records so retries do not dispatch again.
6. Record the newest recoverable transaction time and elapsed restoration/verification time. Calculate measured data loss and duration; agree operational RPO/RTO only after an approved drill. Resume traffic and writes after owner review. Preserve incident logs under the retention policy.

`node scripts/verify-local-restore.mjs` actually dumps a fictional PGlite data directory with gzip, deletes fictional bookings, loads the dump into a new local instance, compares all six application tables, and confirms restored anonymous booking reads fail with SQLSTATE 42501. The local JSON reports measured milliseconds. This is a same-version PGlite checkpoint, not a hosted backup, standard PostgreSQL dump, PITR test or operational RTO. The ignored `.cache/recovery` artifact contains fictional data only.

## Secret rotation

Twilio: create the provider's secondary Auth Token first without promoting it. Deploy the unchanged current token plus the new token in `TWILIO_AUTH_TOKEN_NEXT` and a UTC `TWILIO_TOKEN_OVERLAP_EXPIRES_AT` at most 24 hours in the future. Keep `PUBLIC_CALLBACK_URL` exact, including HTTPS path. Run synthetic checks and an approved real provider test while both tokens are valid. Promote the secondary token in Twilio only after all instances accept it; promotion immediately invalidates the old primary. Then deploy the new primary to `TWILIO_AUTH_TOKEN`, remove overlap variables, and verify callbacks before the overlap expiry. If verification fails, stop promotion and investigate. The code tests acceptance of both tokens, rejection of unknown/expired/excessively long overlap, and exact callback matching. No real token was rotated or call continuity measured, so zero downtime is an operational objective, not an achieved result.

Supabase: distinguish the server API secret from Auth signing keys. Create a replacement server secret through the approved API-key dashboard; update the hosting secret and deploy all server instances before revoking the old key. Verify server-only administrative operations, browser public reads and active signed-in test sessions before revocation. Revoke the old server key only after old deployments stop receiving traffic. Do not rotate Auth signing keys or legacy JWT secrets as a side effect of a server API-key change; those require a separate session-compatible migration plan. Legacy `service_role` JWT migration, managed-key overlap support and actual session survival must be confirmed for the specific project. Do not describe a publishable key as a privileged secret merely because an inherited variable was misnamed.

## Dependency and model updates

Use an isolated branch, exact package versions and updated lockfile; inspect lifecycle scripts before installation. Run `npm ci --ignore-scripts`, `npm run verify:source`, source/client secret scans and rendered browser checks. Review changelogs and the installed version's Next.js documentation. Retain the previous production deployment and compatible database schema until post-deploy verification passes; do not rewrite shared history.

No live LLM model is called by the current deterministic text simulator. For a future approved Gemini/Vapi integration: record the exact provider model identifier, prompt version, tool JSON schema and approval flags in a secret-free change record. Run the fixed fictional scenarios in `src/voice` for invalid tool names, extra fields, unsupported claims, missing consent, timeout, malformed response and duplicate events. Add actual captured provider responses to a separate redacted fixture set, validate every tool output before side effects, compare outcomes with the previous model, and complete a controlled provider canary before promotion. A model critique is not execution evidence. Preserve the prior model/prompt configuration for rollback. Do not enable paid calls, microphone capture, SMS or follow-up dispatch merely to upgrade a model.

## Retirement and purge

1. Obtain the account/data owner's authorization and retention/legal requirements; export only approved records and record the final backup's expiry. Disable new bookings, provider callbacks, outbound dispatch and automated deployments.
2. Move traffic to a clear retirement page. Inventory every production/preview alias, project, database, storage bucket, integration, API key, phone number, assistant and billing subscription in the actual account dashboards. No such inventory is assumed complete here.
3. In Twilio, remove callbacks, release each owned provisioned number and confirm number/usage billing. In Vapi/Google AI, remove the specific project assistants, integrations and keys. Confirm no active calls/jobs depend on them.
4. Delete approved production records, caller/transcript data, storage objects, cache copies and exports using the provider's documented retention mechanisms. Require backup expiry/deletion confirmation. Cryptographic erasure requires destroying the actual encryption key controlling every retained copy; ordinary row deletion is not proof of cryptographic erasure, and managed providers may retain backups temporarily.
5. Remove approved Vercel deployments/projects/domains and Supabase projects/storage only after the recovery window closes. Revoke application credentials and disconnect GitHub integrations. Preserve source/AI provenance/audit evidence that contains no personal data when course retention requires it.
6. Check account resources and the next billing statement for residual paid plans, number rentals and retained storage. Save redacted deletion receipts and unresolved retention limits. Do not claim permanent erasure or zero residual billing without provider confirmation.

Provider references: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [API key types](https://supabase.com/docs/guides/getting-started/api-keys), [Auth signing keys](https://supabase.com/docs/guides/auth/signing-keys), [Twilio token rotation](https://help.twilio.com/articles/223136027-Auth-Tokens-and-How-to-Change-Them), [Vercel rollback](https://vercel.com/docs/cli/rollback), [PGlite API](https://pglite.dev/docs/api), [PostgreSQL restore](https://www.postgresql.org/docs/current/app-pgrestore.html).
