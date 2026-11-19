import fs from 'node:fs'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import SponsorPlacement from '../src/components/SponsorPlacement'
import { AUDIT_SPONSOR_CANDIDATES, AUDIT_SPONSOR_CONTEXT, SPONSOR_PROPERTY_DEMOS } from '../src/lib/sponsorFixtures'
import { traceSponsorSelection } from '../src/lib/sponsorMatcher'
import { createCoarseImpression, handleSponsorRedirect, sponsorRedirectPath } from '../src/lib/sponsorRuntime'
import { validateSponsorDestination } from '../src/lib/sponsorUrl'

async function main() {
  const directory = path.resolve('docs/mfalujo23/evidence')
  fs.mkdirSync(directory, { recursive: true })
  const sponsor = AUDIT_SPONSOR_CANDIDATES[2]
  const propertyId = '60000000-0000-4000-8000-000000000001'
  const publicSponsor = { id: sponsor.id, business_name: sponsor.name, destination_url: sponsor.destinationUrl }
  const request = () => new Request(`http://localhost${sponsorRedirectPath(sponsor.id, propertyId, '90032', 'sidebar')}`)
  const serialize = async (response: Response) => ({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() })
  const evidence = {
    generatedAt: new Date().toISOString(), scope: 'Actual local pure-function/Web Response/static-render execution. No Next HTTP server, cloud, sponsor site, or database called by this script.',
    fixtureProvenance: 'Teacher supplied A/B/C/D tier, distance, impressions, approval status and active dates for ZIP 90032. Fixed date, concrete dates, UUIDs, radius, placement and example.com URLs are explicitly chosen fictional fixture details.',
    audit: traceSponsorSelection(AUDIT_SPONSOR_CONTEXT, AUDIT_SPONSOR_CANDIDATES),
    properties: SPONSOR_PROPERTY_DEMOS.map((demo) => ({ property: demo.property, ...traceSponsorSelection(demo.context, demo.candidates) })),
    validUrl: validateSponsorDestination('https://example.com/approved'),
    unsafeUrl: validateSponsorDestination('javascript:alert(1)'),
    validStoredRedirect: await serialize(await handleSponsorRedirect(request(), async () => publicSponsor)),
    unsafeStoredRedirect: await serialize(await handleSponsorRedirect(request(), async () => ({ ...publicSponsor, destination_url: 'javascript:alert(1)' }))),
    noLongerEligible: await serialize(await handleSponsorRedirect(request(), async () => null)),
    coarseImpression: createCoarseImpression({ sponsorId: sponsor.id, placement: 'sidebar', pageContext: 'home' }, () => new Date('2026-10-24T12:00:00Z')),
    externalNetworkRequests: 0,
  }
  fs.writeFileSync(path.join(directory, 'lab6-actual-results.json'), JSON.stringify(evidence, null, 2) + '\n')
  const paidMarkup = renderToStaticMarkup(React.createElement(SponsorPlacement, { propertyId, targetZip: '90032', sponsor: publicSponsor }))
  const houseMarkup = renderToStaticMarkup(React.createElement(SponsorPlacement, { propertyId: '60000000-0000-4000-8000-000000000003', targetZip: '90034', sponsor: null }))
  fs.writeFileSync(path.join(directory, 'lab6-disclosure-markup.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Fictional disclosure render evidence</title><body><h1>Static fixture evidence</h1>${paidMarkup}${houseMarkup}</body></html>\n`)
  const read = (file: string) => fs.readFileSync(file, 'utf8').trim()
  const sql = read('supabase/migrations/20261118000500_eligible_sponsors.sql')
  const query = sql.slice(sql.indexOf('create or replace function public.eligible_sponsors_for_property'), sql.indexOf('revoke all on function public.eligible_sponsors_for_property')).trim()
  const auditText = [
    '# Audit 6: sponsor eligibility and selection — mfalujo23',
    '', 'Prepared with Codex assistance for review. This file contains actual local evidence; it does not assert a hosted migration, teacher approval, teammate review, or legal/accessibility compliance.',
    '', '## Exact database function', '', 'From `supabase/migrations/20261118000500_eligible_sponsors.sql`:', '', '```sql', query, '```',
    '', 'Approval is checked through `status = APPROVED` plus the legacy approved flag. Active flags and placement must agree. `CURRENT_DATE between start_date and end_date` is inclusive. A linked, approved property must match the requested ZIP5; a campaign is eligible by campaign ZIP5 OR its stored property distance <= campaign radius. The public function returns narrow campaign fields, never internal notes/owner identity. The application validates every returned destination again before selection and redirect.',
    '', '## Exact A/B/C/D execution', '', 'C is selected. First reject D because it is pending (not approved); its Platinum tier never enters sorting. A, B and C pass the chosen active fixture dates, placement and ZIP. Rank tier descending: Gold B/C precede Silver A. Compare Gold distance ascending: C 0.8 < B 1.2. Impressions ascending are consulted only after equal tier AND distance; B having 45 impressions does not beat C with 90. Stable ID ascending breaks any remaining tie. Eligible order is C, B, A. Empty eligibility uses an unpaid internal house message.',
    '', 'Only the four tier/distance/impression/status tuples and active-date condition came from the prompt. The fixture uses fixed 2026-10-24, 2026-10-01 through 2026-10-31, radius 5, sidebar, synthetic IDs and reserved example.com URLs; those additional details are test choices, not claimed instructor data.',
    '', 'Actual trace:', '', '```json', JSON.stringify(evidence.audit, null, 2), '```',
    '', '## Runtime URL validation and exact outputs', '', '```ts', read('src/lib/sponsorUrl.ts'), '```',
    '', 'Actual valid URL result:', '', '```json', JSON.stringify(evidence.validUrl, null, 2), '```',
    '', 'Actual unsafe URL result:', '', '```json', JSON.stringify(evidence.unsafeUrl, null, 2), '```',
    '', 'Exact client response from the redirect handler with an unsafe stored URL (local helper execution; no URL was fetched):', '', '```json', JSON.stringify(evidence.unsafeStoredRedirect, null, 2), '```',
    '', 'The handler rejects client-supplied URLs, unknown/repeated query parameters and a sponsor ID that is no longer the selected eligible record. All responses disable caching. HTTPS/host/IP validation is lexical; it does not prove the owner, content, DNS resolution or future behavior of a remote site. No server fetch follows the destination.',
    '', '## Disclosure JSX and actual DOM render', '', '```tsx', read('src/components/SponsorPlacement.tsx'), '```',
    '', 'The visible `Sponsored — paid local partner` paragraph is referenced by the aside and the link. The link accessible name begins `Sponsored partner`, identifies the destination business and announces a new tab. The unpaid fallback explicitly says `House message - no paid sponsor`. Static output is preserved in `evidence/lab6-disclosure-markup.html`. DOM assertions check the visible disclosure, `aria-label`, `aria-describedby` and `rel`. These checks alone do not establish FTC or WCAG compliance.',
    '', '## Verification limits', '', 'Focused test output is in `evidence/lab6-tests.txt`; actual selection, URL, redirect and coarse impression results are in `evidence/lab6-actual-results.json`. The coordinating backend agent executed the exact migration and fixture against disposable local PostgreSQL in PGlite for UUID and historical TEXT/company_name-NOT-NULL schema families. Both returned C, B, A with D excluded; actual outer and inner EXPLAIN plans, permission denials, coarse event insertion and counter increment are recorded in `backend-evidence/local-sponsor-results.json`. See the decision note for the execution limits. No cloud migration or sponsor click is part of this evidence. The required ChatGPT-and-Gemini critique, human partner review and course submission remain separate actions; Codex output is not labeled as either required tool run.', '',
  ].join('\n')
  fs.writeFileSync(path.resolve('docs/mfalujo23/lab6-audit.md'), auditText)
  console.log(JSON.stringify({ selected: evidence.audit.selected?.name, eligibleOrder: evidence.audit.rankedEligibleIds, cases: evidence.properties.map((item) => item.selected?.id ?? 'house'), unsafeClientStatus: evidence.unsafeStoredRedirect.status, externalNetworkRequests: 0 }))
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
