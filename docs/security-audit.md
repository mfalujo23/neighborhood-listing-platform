# Services and Bookings Authorization Audit

## Anonymous, provider, client and administrator matrix

| Context | SQL operation | Verified outcome |
| --- | --- | --- |
| Anonymous | SELECT approved active services | Two fictional public services returned. |
| Anonymous | SELECT drafts | Empty array. |
| Provider A | UPDATE own draft | One affected row. |
| Provider A | UPDATE Provider B draft | Zero affected rows. |
| Provider A | UPDATE or DELETE own suspended service | One affected row in each rolled-back test. |
| Provider A | Change draft status to approved | 42501 RLS denial. |
| Anonymous client | INSERT valid booking | One affected row; no RETURNING contact data. |
| Anonymous client | SELECT bookings | 42501 table-permission denial. |
| Authenticated client | SELECT bookings | Empty array. |
| Server administrator | SELECT all bookings | Two fictional booking IDs returned. |
| Server administrator | Suspend approved service | One affected row. |
| Browser newcomer | INSERT own admin profile | 42501 RLS denial. |
| Server administrator | INSERT each required profile role | admin, merchant, provider and client accepted. |
| Server administrator | INSERT any legacy role | owner, public, user, property_professional and local_sponsor rejected with 23514. |

The test runner executes actual PostgreSQL role switches and queries in disposable
PGlite databases. Each write case rolls back. It is not a Supabase JWT,
PostgREST, or hosted-database test. Exact SQL, parameters, raw rows, affected-row
counts and SQLSTATE messages are retained in
[database-results.json](mfalujo23/midterm-evidence/database-results.json).

## Migration and role compatibility

The required exam migration now bootstraps a fresh profiles table using exactly
the four required roles. The subsequent forward repairs close inherited
permissive policies and restore missing application tables. Migration 007 adds
an exact four-role NOT VALID CHECK and narrows browser profile creation to
client/provider/merchant.

Existing fictional legacy profiles are retained byte-for-byte through the
forward repair and reapplication. New legacy-role writes fail. Updating a legacy
profile also requires converting its role to an allowed value; no silent role
mapping is performed. Legacy constraint validation and actual hosted rollout
remain separate operations.

All five exam tables have RLS enabled. Service-role CRUD remains subject to SQL
CHECK constraints. Elevated credentials are read lazily inside server-only code.
The required [supabaseServer.ts](../src/lib/supabaseServer.ts) is used by the
service and booking APIs and re-exports the guarded administrator getter.

## HTTP guards and privacy

- Service POST uses a verified provider/merchant identity, binds provider_id,
  forces draft, and rejects unknown fields.
- Service GET validates its public response. Malformed database output returns
  502 and is not rendered.
- Booking POST uses the shared strict contract and returns a receipt without
  selecting or echoing client contact data.
- Booking failures map SQL 42501 to 403, integrity failures to 400, and connection
  failures to 503; logs retain an error code rather than contact data.
- Administrator approval/suspension checks the session and protected role before
  constructing the elevated client. Invalid administrator bodies return 400.

[API tests](../src/test/serviceApi.test.ts) and
[admin tests](../src/test/adminService.test.ts) use explicit synthetic transports.
They verify route behavior without claiming a real provider request. The
separate PostgreSQL runner verifies database enforcement.

## Reproduce the local evidence

```sh
npm ci --ignore-scripts
npm test
npm run lint -- --max-warnings 0
npm run typecheck
npm run build
```

npm test includes both the inherited 45-case backend SQL regression runner and
the new fresh/legacy midterm SQL runner. See
[verification](mfalujo23/midterm-verification.md) for exact final counts.

## Remaining verification

The reachable-history scan reported 13 generic-rule findings: four generated
Next encryption/signing fields and nine public-client-key workflow findings.
The refined classification confirms sb_publishable_ values even in the
misleadingly named SERVICE_ROLE variable; it does not identify a privileged
provider-secret leak. Default main's configuration fix is published as aac017d.
No key was printed or validated against a provider, and no absolute
zero-keys-in-history claim is made. The concrete
[remediation plan](mfalujo23/security-history-remediation.md) identifies owner
actions, current-deployment verification, and retained sanitized evidence.

Hosted Supabase migration/Auth/PostgREST, real signed-in provider/admin requests,
a deployment of the examination head, owner resolution of historical findings, student
personal review and required review are not established by local tests. Actual
browser keyboard and 375/768/1280 grid checks are recorded in the verification
notes. A screen-reader audit and full WCAG certification have not been performed.
