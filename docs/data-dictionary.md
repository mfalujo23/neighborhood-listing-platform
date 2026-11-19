# Data dictionary

| Table | Main relationships and purpose | Access |
| --- | --- | --- |
| profiles | Managed Auth ID; protected admin/merchant/provider/client role | Own profile reads; role changes stay trusted |
| properties | Owner, address, price, rooms, amenities, approval | Public approved reads; permitted owner draft writes |
| services | Provider, rate, duration, radius, status, coverage flag | Public approved projection; provider draft/suspended edits |
| service_categories | Name, unique slug, active flag | Approved service discovery context |
| service_category_mappings | Composite service/category key | Links service to category |
| bookings | Service FK, email, date, notes, UTC timestamp | Insert allowed; client/public reads denied; designated provider/admin reads |
| sponsors | Merchant owner, approval/active flags, dates, ZIP/radius, tier, destination | Public narrow RPC; merchant-owned pending inactive drafts |
| property_sponsors | Property/sponsor composite key and distance | Owner-scoped reads; trusted linking |
| sponsor_placement_impressions | Coarse sponsor/context/date record | Narrow service-only record RPC; no direct API-role table read |
| analytics_events | Strict event ID, source, property, time and controlled event fields | Provider-owned/admin reads; trusted ingestion |
| telephony_webhook_events | Event ID, status, masked suffix, processed timestamp | Trusted insert-only; no public/browser reads |

See [core and optional SQL](../supabase/cloud/classroom/source-manifest.json),
[service contract](../src/schemas/service.ts), [fixture property contract](../src/schemas/property.ts),
[public listing contract](../src/schemas/listing.ts)
and the [event dictionary](mfalujo23/lab14-data-dictionary.md).

Fixtures and hosted rows are separate. `/listings` keeps the validated fixture
collection and existing filters. `/listings/live` reads approved public records
through the existing route, with loading, empty, error and retry states.

The inherited [core migration](../supabase/migrations/20261025_create_core_tables.sql)
contains inquiry DDL. Inquiries were excluded from the guarded fresh eleven-table
rollout; no current inquiry endpoint or persisted inquiry was tested. The required
conceptual relationship design includes inquiries. Bookings are the current
persisted service-request records.
