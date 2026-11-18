# Backend acceptance and traceability

This is the `mfalujo23` remediation of inherited Lab 5 and midterm backend work,
prepared with Codex assistance. It does not attribute earlier teammates' work to
this account. All executed database evidence is local and fictional.

## Provider / merchant - Medium

As an authenticated provider or merchant, I can submit a valid service draft.

- Given a verified session and a provider/merchant profile, when a strict payload
  contains title (5-200 trimmed characters), nonnegative finite hourly rate,
  integer duration >=15, and positive integer coverage radius, then the route
  binds `provider_id` to the session user and forces `status='draft'`.
- Given unknown keys, an incompatible old payload, or invalid values, the route
  returns structured HTTP 400 before persistence. A missing/expired session
  returns 401; a client profile returns 403.
- Given the owner's draft or suspended service, SQL permits changes; another
  provider's record or a live approved service is not writable. The owner cannot
  self-publish by changing status to approved.

Trace: `src/schemas/service.ts`; `src/app/api/services/route.ts`;
`20261118000400_restore_backend_contracts_rls.sql`; `serviceApi.test.ts`;
local SQL cases in `backend-evidence/local-rls-results.json`.

## Resident / anonymous visitor - Medium

As a resident, I can view public services and request a booking without learning
other clients' booking or contact data.

- Given an anonymous query, only approved services with active coverage are
  visible. Category and category-mapping reads expose active categories only.
- Given a valid booking for a public approved active service, insertion is
  allowed. The API returns a receipt without `SELECT` or `RETURNING` of booking
  contact data. Invalid dates, emails, notes, or additional fields are rejected.
- Anonymous booking reads fail with table permission error 42501; authenticated
  client reads are filtered to an empty array. Providers can read bookings for
  their own services, and cannot read another provider's bookings.

Trace: `src/app/api/bookings/route.ts`; public service GET; the migration's
booking/category policies; local SQL and mocked-route tests.

`coverage_active` is an explicit operational flag added to make inactive
coverage testable alongside the required positive radius. The examination does
not specify a geographic district/zone model. Geographic distance calculation
and district filtering are not claimed by this implementation.

## Administrator - Medium

As a platform administrator, I can approve records and audit bookings through
trusted server execution.

- The existing admin routes verify the caller's session and own `profiles.role`
  before creating the server-only service-role client.
- SQL `service_role` may perform CRUD while remaining subject to data CHECK
  constraints. It is not the table owner and has no schema alteration grant.
- Browser identities cannot insert an administrator profile, update their role,
  approve their own property, or edit live services. No service key is exposed
  to client code. A profile with role admin is not treated as a service-role
  database connection by the backend property policies.

Trace: `src/lib/supabase-server.ts`; existing `src/app/api/admin/` routes;
the new migration and real local role matrix. Live Supabase session verification
and administrator requests remain unexecuted; route transport was mocked locally.

## Migration and execution boundary

The new migration recreates missing service tables, adds required property
columns, and replaces permissive policy conflicts without deleting or rewriting
application rows. The historical `20261105082900_remote_schema.sql` contains
table drops and is not a safe development bootstrap. It was inspected, not run.

Fresh schema creation and an observed-style legacy drift state are tested.
Legacy rows are preserved across migration and reapplication. New CHECK
constraints use `NOT VALID` to preserve pre-existing incomplete data while
enforcing new inserts/updates; actual legacy cleanup and constraint validation
must be reviewed before a hosted rollout. Recreating a dropped table cannot
recover rows already deleted by an earlier deployment.

No hosted database migration, production data access, real authentication, or
deployment has been performed in this remediation.
