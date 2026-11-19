# Lab 14 privacy and operations note

The public fixture demonstration stores only prewritten fictional events in volatile component memory. Optional collection starts false. Loading is disabled until permission is checked. Revocation clears memory and turns permission off; refresh discards the in-memory store. Nothing is sent to an analytics provider, cookie store or browser storage. The client has no audio, recording, transcript or personal-contact input.

The protected server path is separate. `ENABLE_ANALYTICS` must be the literal `true`; `ANALYTICS_FIXTURE_MODE=true` is also required for fixture writes. Defaults are off. The endpoint verifies a bearer token with Supabase `auth.getUser`, then reads the protected profile role. Reads accept admin/provider plus existing protected legacy property_professional profiles. Legacy profiles cannot invoke fixture writes; merchant/client are denied. Role metadata supplied by the caller is ignored. A canonical provider fixture write is checked against current property ownership before the privileged insert client is created. SQL RLS applies again to reads; unauthenticated users have no table or RPC grants. The production service key remains in the existing server-only client module.

This repository currently has no interactive sign-in/session-cookie adapter for the new page. `/realtor-dashboard` consumes a trusted Authorization header on the server and fails closed for ordinary anonymous navigation. Its API can be integrated with the authenticated application later; that integration has not been demonstrated with a live Supabase session. No hosted schema was queried or migrated by this work.

The protected server page renders the latest seven UTC days. Date/property filtering is implemented in the strict POST API and the interactive public fictional demo; a signed-in filter UI on the protected page remains to be integrated with the application's real session flow.

## Data minimization and idempotence

The event schema is discriminated by nine allowed names and uses strict objects. Unknown keys, PII-shaped extras and raw text are rejected with fixed error codes rather than echoed payloads. Input bodies are capped at 8 KiB, streamed to enforce the cap even without Content-Length, and require JSON. Timestamp age is restricted to 30 days with a two-minute future tolerance. The fixture ingress rejects provider-measured claims; real provider ingestion is a separate unimplemented trust boundary.

Rows contain normalized event columns, opaque context IDs and a SHA-256 canonical-payload fingerprint. The fingerprint supports duplicate-vs-conflict checks, not anonymization. PostgreSQL's primary key makes concurrent retries atomic: same ID cannot insert twice. A duplicate ID with a different fingerprint returns 409. Sponsor clicks must reference a stored same-property, same-correlation, same-source impression. Unknown/improper parent clicks are rejected, while SQL also checks the join before counting. A provider must retry after its parent impression is accepted if events arrive out of order.

The reader returns aggregates only. It uses one bounded SQL statement for the event window and CTR snapshot, excludes payload hashes and refuses windows beyond 5,000 rows rather than reporting partial denominators. Authorized internal row processing is server-side; event/correlation IDs, tokens and raw rows are not serialized into the dashboard response. Filters use POST JSON/component state, and responses set `Cache-Control: no-store`, `Vary: Authorization` and `Referrer-Policy: no-referrer`. A real hosting/logging configuration must still be reviewed before collecting live events.

## Retention and deletion procedure

The design target is a 30-day raw-event lifetime with no persisted historical rollups. `public.purge_expired_analytics()` is executable only by service_role and deletes rows older than 30 days. The local PostgreSQL test actually executes the procedure in a rolled-back transaction against an expired fictional event. The migration does not install a scheduler; an operator must arrange and verify a daily restricted job before enabling collection. No hosted deletion job or completed real-data deletion is claimed.

For an approved scoped deletion request, a trusted operator should verify the requested property/correlation scope, use parameterized DELETE in an authorized transaction, inspect the affected count, commit only the verified scope, and record an event-free operation ID/count/status. Do not put access tokens, email, telephone, caller content or query payloads in the operation log. Example shape, not executed against any hosted database:

```sql
-- Parameters are verified opaque IDs; perform via a restricted operator tool.
delete from public.analytics_events
where property_id = $1::uuid and correlation_id = $2::uuid;
```

Deleting an impression cascades to its linked click rows; deleting a property cascades its event rows. The purge function's returned count is the directly deleted count, not necessarily all cascaded children. Live-consent receipt verification and a user-facing deletion workflow need separate implementation before any real participant data is collected. The current fixture-only route does not establish a legal consent-management system.

## Risks and verified limits

Short-lived correlation IDs and property-level categories remain linkable operational data. Role scoping, limited retention and minimizing columns reduce exposure; they do not prove anonymity. Small denominators show insufficient rates, but this does not establish a complete statistical disclosure-control policy. No FERPA, WCAG or other legal compliance certification is claimed.

Local evidence includes strict validation, duplicate/conflict/revocation and UTC-boundary tests; mocked authenticated SDK behavior; actual PostgreSQL grants/RLS, distinct CTR, shape constraints and retention; and schema reapplication without row loss. These use fictional rows and auth stubs. Real authenticated sessions, production log behavior, operational retention scheduling and provider end-to-end measurements remain pending.
