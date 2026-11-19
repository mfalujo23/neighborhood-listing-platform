# Local Services and Appointment Booking Requirements

## 1. Service provider or merchant

As an authenticated provider or merchant, I want to submit service drafts with
hourly rates so residents can request appointments after administrator approval.

Scope: Medium.

- Given a verified provider or merchant session, when a valid strict service
  payload is submitted, then the server binds provider_id to that session and
  saves status=draft.
- Given missing authentication, when a draft is submitted, then the API returns
  401. A verified client profile receives 403.
- Given an unknown key, short title, negative rate, duration below 15, or invalid
  radius, when submitted, then structured 400 errors are returned before insert.
- Given the provider's own draft or suspended service, when editing or deleting,
  then RLS permits the operation. Another provider's or a live approved service
  cannot be modified, and providers cannot self-publish.

Trace: [required exam migration](../supabase/migrations/20261029140000_exam_services_persistence.sql),
[forward repair](../supabase/migrations/20261118000400_restore_backend_contracts_rls.sql),
[exact-role forward constraint](../supabase/migrations/20261118000700_midterm_profile_roles.sql),
[service schema](../src/schemas/service.ts), [service API](../src/app/api/services/route.ts).

## 2. Neighborhood resident

As a resident, I want to browse approved local services and request an appointment
without seeing bookings or contact information submitted by other clients.

Scope: Medium.

- Given an anonymous visitor, when requesting services, then only approved
  services with active coverage are returned, with exactly the five public
  fields required by the examination.
- Given valid public records, when visiting /services, then semantic service
  cards show rate, duration and radius in a Tailwind 1/2/3-column layout.
- Given malformed runtime service data, when loading the catalog, then a
  recoverable error is shown instead of rendering unsafe data.
- Given valid email, calendar date and notes, when submitting a booking, then
  only that booking payload is inserted and a receipt is returned without
  selecting or echoing contact records.
- Given invalid fields, when submitting, then errors are associated with their
  controls and focus moves to the first invalid field. Cancel returns focus to
  the opening button; successful submission focuses the receipt.
- Given an anonymous booking SELECT, then SQL denies table access with 42501.
  Given an authenticated client SELECT, then RLS returns no booking rows.

Trace: [booking schema](../src/schemas/booking.ts),
[booking API](../src/app/api/bookings/route.ts),
[mounted page](../src/app/services/page.tsx),
[ServiceCatalog](../src/components/ServiceCatalog.tsx),
[ServiceCard](../src/components/ServiceCard.tsx),
[security matrix](security-audit.md).

The specified DDL supplies radius and active categories but no district/zone
entity or coordinates. This implementation uses coverage_active as an explicit
availability flag. District grouping and geographic distance matching are not
implemented or inferred from that flag.

## 3. Platform administrator

As an administrator, I want to approve or suspend service offerings and audit
bookings so unsafe offerings can be removed from public discovery and booking.

Scope: Medium.

- Given a verified session whose protected profile role is admin, when PATCH
  /api/admin/services receives an approved or suspended update, then the
  server-only elevated client applies it. Providers and clients receive 403.
- Given suspension, when anonymous visitors query or book the offering, then
  approved-only RLS removes it from public results and rejects booking inserts.
- Given a verified administrator, when requesting /api/admin/bookings, then
  the protected server route may audit bookings.
- Given a browser identity, when trying to assign its own admin role, then RLS
  rejects the insert. New profile writes accept only admin, merchant, provider,
  or client; existing legacy rows are retained without granting new legacy roles.

Trace: [server-only compatibility module](../src/lib/supabaseServer.ts),
[admin service API](../src/app/api/admin/services/route.ts),
[admin booking API](../src/app/api/admin/bookings/route.ts),
[exact-role forward constraint](../supabase/migrations/20261118000700_midterm_profile_roles.sql).

Suspending offerings is implemented. Disabling an actual Supabase Auth account,
cloud deployment, hosted authentication and hosted database migration require
separate provider-side execution and evidence.
