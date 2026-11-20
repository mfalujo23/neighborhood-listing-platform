# Analytics role compatibility correction

The canonical four-role profile contract uses admin, provider, merchant and client. Analytics now accepts a verified provider as the property-facing account and scopes reads to properties it owns. Administrators can read all permitted scopes; merchant/client are denied. Existing protected property_professional profiles retain owned-property reads only. They cannot invoke fixture ingestion, even if they own the property. No profile constraint or signup policy is widened.

The dependency007 migration is copied byte-for-byte from published midterm commit f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5. It preserves existing legacy rows but rejects new legacy profiles. The separate forward policy correction changes only analytics_scoped_read. Existing event validation, fixture/live-source separation, no-store responses and default-off flags remain in force.

The updated unit suite passes45 cases. The disposable PostgreSQL runner passes14 actual cases: canonical/other/fresh-provider ownership; admin access; merchant/client exclusion; preserved legacy read-only access; new legacy-profile rejection; and idempotent policy reapplication. SDK tests also prove a legacy profile is denied before an ownership query/privileged client, and a canonical provider write requires a verified owned property. These are synthetic local auth/data checks, not real Supabase sessions.

The original32-file analytics snapshot is preserved. This correction is a separate overlay; the current browser-QA checkout was not changed by preparing it.
