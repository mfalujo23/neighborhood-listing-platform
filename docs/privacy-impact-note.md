# Privacy impact note

Use fictional or specifically approved demonstration data. Do not put real
client records, private contacts, passwords, keys or full transcripts in Git,
prompts, screenshots or public reports.

Bookings store an email and request notes behind RLS. Public visitors and clients
cannot read the booking collection. Managed Auth credentials and session cookies
stay out of published evidence; privileged keys stay server-side.

Analytics accepts controlled event fields, with no free-text notes, phone,
address, IP or transcript fields. Fixture data is labeled separately from real
provider measurements. Public demo telemetry is optional and remains in page
memory. Revocation clears that dataset. Server retention targets 30 days; an
actual retention schedule is still pending.

UAT needs voluntary consent and a recording choice before participation. Notes
must be deidentified before AI use; quotes need separate permission. Contact-to-
code mappings remain private. No completed participant sessions are recorded.

See the [analytics privacy design](mfalujo23/lab14-privacy-and-operations.md),
[UAT plan](mfalujo23/lab13-uat-plan.md) and [voice limits](voice-runbook.md).
