# Lab 5 / midterm backend authorization audit

Date: 2026-11-18. Automated local evidence produced by Codex for `mfalujo23`.

## Target and policy

The main audited resource is `public.properties`, with additional service,
profile, category, mapping, and booking checks. The forward migration is
`supabase/migrations/20261118000400_restore_backend_contracts_rls.sql`.

Exact owner update policy from that migration:

```sql
alter table public.properties enable row level security;
create policy backend_property_owner_update on public.properties
  for update to authenticated
  using (owner_id = (select auth.uid()) and approved is false)
  with check (owner_id = (select auth.uid()) and approved is false);
```

Anonymous SELECT requires `approved is true`. Owners additionally see their own
records. Inserts bind owner identity and require unapproved status. Older
permissive INSERT/UPDATE and `is_published` SELECT policies are removed because
PostgreSQL combines permissive policies with OR. The local regression fixture
actually demonstrated their previous self-approval and unapproved-public-read
behavior before the correction, with writes rolled back.

## Role operations matrix

| Context | Permitted operation verified | Denied operation verified | Enforcement |
| --- | --- | --- | --- |
| Anonymous, no user Authorization identity | SELECT approved property | INSERT property: 42501 | SELECT RLS approved predicate; no INSERT grant. |
| Authenticated owner `11111111-1111-4111-8111-111111111111` | UPDATE own unapproved property | UPDATE approved=false to true: 42501 | Both USING and WITH CHECK require same owner and approved=false. |
| Other authenticated user `22222222-2222-4222-8222-222222222222` | SELECT approved public property | UPDATE another owner's private row: zero affected rows; forged INSERT: 42501 | Row not visible/writable; insertion owner predicate fails. |
| Server administrator, `service_role` | SELECT all records and approve property | Invalid negative-price INSERT: 23514; ALTER TABLE: 42501 | BYPASSRLS does not bypass CHECK constraints or grant table ownership. |

The administrator's CRUD authority is intentional; a fake RLS-based CRUD denial
is not claimed. Its denied INSERT is a data-constraint failure, and its separate
DDL denial confirms limited schema privileges.

## Concrete diagnostic SQL and actual results

All identities and records below are fictional. The runner creates fresh PGlite
databases and locally defines `auth.uid()` from a transaction setting. `SET ROLE`
represents database contexts; it is not a real Supabase JWT or HTTP request.

```sql
begin;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select id from public.properties
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001';
-- Actual rows: []
rollback;
```

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222', true);
update public.properties set title='Forbidden other edit'
where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001' returning id;
-- Actual rows: []; affectedRows: 0
rollback;
```

The JSON report contains the exact SQL, bind parameters, actual rows/affected-row
counts, and database errors for every case. For an owner self-approval attempt:

```json
{"code":"42501","message":"new row violates row-level security policy for table \"properties\""}
```

An empty SELECT result means the query was permitted but its rows were filtered
or absent; it does not prove the record does not exist. An explicit permission
error denies the operation itself. HTTP 401/403 are API/authentication responses,
not the meaning of a SQL empty array. Mocked route tests separately verify 401
for absent/expired sessions, 403 for unauthorized roles/RLS code42501, and 400
for payload/check violations. They do not claim a live PostgREST response.

## Reproduction and scope

```sh
npm ci --ignore-scripts
npm run test:db
npm test
npm run lint -- --max-warnings 0
npm run typecheck
npm run build
```

The real engine is PostgreSQL 18.6 via dev-only PGlite 0.5.16. The capability
probe, `scripts/local-db-smoke.mjs`, first verified CREATE ROLE, SET ROLE, a
filtered SELECT, and a genuine 42501 denial. The complete runner applies the
forward migration to a fresh schema and a legacy fixture, preserves existing
rows, reapplies the migration, and executes 45 role/constraint regression cases.

The database tests are part of `npm test`; a failing assertion fails the process.
The historical destructive export is never executed. The local bootstrap accepts
no database URL or real authentication token, and no application route accepts
the test identity stub.

Actual limits: one disposable PostgreSQL WASM connection, local auth stub, no
Supabase Auth or PostgREST, no hosted migration, no production data, no real
provider request, and no multi-connection or production-load claim. Existing
legacy data still needs preflight review before hosted constraint validation.

Primary references: [PGlite's documented local testing use](https://pglite.dev/docs/about)
and [PostgreSQL RLS semantics](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Final verification

The isolated publication snapshot starts at voice catch-up commit
`c88d1a47559566f3d858d11788bceee91197bfc8` and adds only the backend file group.
Sponsor and later analytics changes are excluded. Node 24.22.3 and npm 11.21.3
were used for these actual checks, all with exit code 0:

| Check | Result |
| --- | --- |
| Clean `npm ci --ignore-scripts` | 439 packages added; 446 audited; zero reported vulnerabilities. |
| `npm run lint -- --max-warnings 0` | Passed with zero warnings. |
| `npm run typecheck` | Passed. |
| `npm test` | 77 Vitest tests, 19 webhook tests, and 45 real PostgreSQL role/constraint cases passed. |
| `npm run build` | Production compilation, TypeScript, and all 11 static-generation tasks passed. |

The SQL run also verified empty-schema creation, preservation of the fictional
legacy row, migration reapplication, and three historical policy bypasses before
the fix. Raw results include exact bind values and SQLSTATE errors. A legacy
module-format warning and build warnings for unconfigured optional Upstash Redis
remain visible in the logs; no Redis service was provisioned or contacted.

Raw evidence and command records are retained in `backend-evidence/`. The build
ran outside the Windows filesystem sandbox because earlier builds encountered
generated-directory permission errors inside it; no source workaround or fake
credential was added. Hosted deployment, genuine student review, required
separate model comparisons, and a real instructor/peer review remain outside
these automated local checks.
