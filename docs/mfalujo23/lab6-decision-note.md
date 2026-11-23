# Lab 6 decision note — mfalujo23

Current status: [coursework status](../current-status.md). The rules and local results below retain the original migration scope. Later hosted sponsor reads and the current merchant-only draft policy are in [hosted reproduction](hosted-reproduction.md). An admin browser does not gain approval rights from the earlier policy description; trusted server authorization is required.

The selector now has a narrow public database path, explicit rejection reasons, deterministic fixture evidence and a revalidated redirect. Existing campaign rows, prior student history and historical impression logs are preserved.

## Rules and precedence

The pure `selectSponsor(context, candidates)` has an injected date string and no network, storage, random source or caller identity. Candidates must have an ID/name, approval, active state, the exact placement, real inclusive campaign dates, valid ZIPs, finite nonnegative distance/radius and a safe integer impression count. A ZIP5 match (ZIP+4 is normalized to ZIP5) OR distance within the inclusive radius makes geography eligible. An exact ZIP is an eligibility alternative, not an extra ranking bonus. Even an exact ZIP candidate needs a known valid distance because distance is a ranking input.

Eligibility precedes ranking. Rank eligible candidates by tier descending (Platinum, Gold, Silver), then distance ascending, then impressions ascending, then stable ID ascending. This preserves the existing documented tier/distance policy while making it testable. Fewer impressions matter only after tier and distance tie. Inputs are not mutated. No match yields `House message - no paid sponsor`, with an internal demo-listing link.

Audit 6 selects C: pending D fails approval before its Platinum tier is considered; Gold C/B outrank Silver A; C's 0.8 miles outranks B's 1.2. The actual ordered trace is in `evidence/lab6-actual-results.json`. Only the teacher's tier/distance/impression/status tuples and active-date condition came from the prompt. UUIDs, dates, radius, placement and example.com destinations are labeled fictional test choices.

## Database and redirect boundary

`eligible_sponsors_for_property` requires an approved linked property and matching requested property ZIP5. It applies approved status plus the legacy approval flag, both active flags, placement, `CURRENT_DATE` inclusive dates and campaign ZIP/radius before returning narrow campaign fields. Invalid/missing numeric data is rejected again in the application instead of being replaced by an invented distance. Administrative approval fields must agree; inconsistent legacy rows stay ineligible until deliberately reviewed.

The forward migration adds missing columns without casting stored sponsor IDs or overwriting existing campaigns. Sponsor IDs can remain UUID or historical TEXT; the RPC exposes bounded safe text IDs. Company name lookup supports `business_name`, `company_name`, then `name`. Historical broad sponsor policies are replaced with owner access to pending inactive drafts and administrator approval; anonymous callers use the narrow RPC. This migration depends on the backend's protected `profiles` role contract and canonical UUID property IDs. It must be inspected against the real database schema before any hosted application.

Redirect requests carry sponsor ID, property ID, ZIP and placement, and accept no destination parameter. The server recomputes selection at click time and redirects only if that same ID is still selected. It validates the approved record's HTTPS URL again, rejects raw IP/local/reserved hosts and credentials, and returns a fixed safe error on failure. The route never fetches the remote site. URL checks are lexical and do not prove remote content, ownership, DNS or future behavior. Changing eligibility between render and click may produce a safe 404.

The database uses `CURRENT_DATE`; the application rechecks its injected clock as UTC date. A disagreement around a timezone boundary can suppress a placement rather than bypass the database date gate. A hosted deployment should deliberately align its database timezone to the application's UTC campaign convention. No timezone setting was changed here.

## Disclosure and restrained events

The paid card places `Sponsored — paid local partner` next to its content, references it through `aria-labelledby`/`aria-describedby`, and starts the link's accessible name with `Sponsored partner`. The link uses `rel="sponsored noopener noreferrer"` and announces the new tab. House content is explicitly unpaid. Static DOM assertions are evidence for these features, not an FTC/WCAG compliance determination or a full assistive-technology audit.

`ENABLE_SPONSOR_IMPRESSIONS` must equal the literal string `true` before an administrator client is created. It is disabled by default. The input schema rejects additional fields; the RPC receives only sponsor ID, placement and an enum page context. PostgreSQL generates the timestamp. No IP, caller identity, address or free text is logged. The new coarse log preserves old event tables. These are server-render attempts, not verified human views; impressions are not deduplicated and should not be used as a billing metric. Impression-count ranking ties can change after enabled writes, while a fixed input fixture remains deterministic.

## Evidence and remaining actions

- Focused Vitest: 58 passed across matcher, URL validation, public RPC wiring, disclosure, redirect and default-off telemetry. All database/provider clients in those tests are mocks; no sponsor site was contacted.
- Exact helper response and selection output: `evidence/lab6-actual-results.json`; static disclosure markup: `evidence/lab6-disclosure-markup.html`.
- Reproduce: `npx vitest run src/test/sponsorMatcher.test.ts src/test/sponsorUrl.test.ts src/test/sponsorRuntime.test.ts src/test/sponsorActions.test.ts` and `npx tsx scripts/lab6-sponsor-evidence.ts` using the pinned repository toolchain.
- The backend agent actually executed the migration/fixture in disposable local PostgreSQL in PGlite for both UUID and historical sponsor-TEXT/required-company-name schema families (property IDs remain UUID in both). Both produced C, B, A; wrong ZIP/unknown property returned no rows; anonymous direct SELECT and event RPC were denied with SQLSTATE 42501; service-only event insertion and counter increment were observed and rolled back. Owner draft insert/update passed, self-approval/activation/ownership transfer failed with 42501, another owner read no rows/updated zero rows, and trusted administrator approval affected one row. Reapplying 00500 preserved data. Actual outer and exact-inner SELECT EXPLAIN plans are in `backend-evidence/local-sponsor-results.json`; reproduce with `node scripts/verify-local-sponsors.mjs` after the backend prerequisite files are present. These are fictional data and local auth stubs. No cloud schema was queried or changed, and no hosted runtime is claimed. No new index is justified by four fictional rows; retain existing indexes and inspect representative cardinalities before production tuning.
- The actual [consolidated ChatGPT/Gemini review](consolidated-model-review.md) is recorded separately. Required human review and course submission remain separate evidence; no partner participation or approval is invented.
