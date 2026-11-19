# Audit 6: sponsor eligibility and selection — mfalujo23

Prepared with Codex assistance for review. This file contains actual local evidence; it does not assert a hosted migration, teacher approval, teammate review, or legal/accessibility compliance.

## Exact database function

From `supabase/migrations/20261118000500_eligible_sponsors.sql`:

```sql
create or replace function public.eligible_sponsors_for_property(
  p_property_id uuid, p_zip text, p_placement text default 'sidebar'
) returns table (
  id text, business_name text, destination_url text, status text,
  is_active boolean, placement text, start_date date, end_date date,
  target_zip_codes text[], coverage_radius_miles numeric, tier text,
  impression_count bigint, distance_miles numeric
) language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select s.id::text, coalesce(nullif(s.business_name, ''), nullif(s.company_name, ''), nullif(s.name, ''), 'Local partner'),
    s.destination_url, s.status, s.is_active, s.placement, s.start_date,
    s.end_date, s.target_zip_codes, s.coverage_radius_miles, s.tier,
    s.impression_count::bigint, links.distance_miles
  from public.properties p
  join lateral (
    select ps.sponsor_id, min(ps.distance_miles) as distance_miles
    from public.property_sponsors ps
    where ps.property_id = p.id and ps.distance_miles >= 0
    group by ps.sponsor_id
  ) links on true
  join public.sponsors s on s.id = links.sponsor_id
  where p.id = p_property_id and p.approved = true
    and p_zip ~ '^[0-9]{5}(-[0-9]{4})?$'
    and left(p.zip_code, 5) = left(p_zip, 5)
    and p_placement ~ '^[a-z][a-z0-9_-]{0,79}$'
    and s.status = 'APPROVED' and s.approved = true
    and s.is_active = true and s.active = true
    and s.placement = p_placement
    and CURRENT_DATE between s.start_date and s.end_date
    and s.tier in ('Platinum', 'Gold', 'Silver')
    and s.impression_count >= 0 and s.coverage_radius_miles >= 0
    and s.target_zip_codes is not null and s.destination_url is not null
    and not exists (select 1 from unnest(s.target_zip_codes) z
      where z is null or z !~ '^[0-9]{5}(-[0-9]{4})?$')
    and (exists (select 1 from unnest(s.target_zip_codes) z
      where left(z, 5) = left(p_zip, 5))
      or links.distance_miles <= s.coverage_radius_miles)
  order by case s.tier when 'Platinum' then 3 when 'Gold' then 2 else 1 end desc,
    links.distance_miles asc, s.impression_count asc, s.id::text asc;
$$;
```

Approval is checked through `status = APPROVED` plus the legacy approved flag. Active flags and placement must agree. `CURRENT_DATE between start_date and end_date` is inclusive. A linked, approved property must match the requested ZIP5; a campaign is eligible by campaign ZIP5 OR its stored property distance <= campaign radius. The public function returns narrow campaign fields, never internal notes/owner identity. The application validates every returned destination again before selection and redirect.

## Exact A/B/C/D execution

C is selected. First reject D because it is pending (not approved); its Platinum tier never enters sorting. A, B and C pass the chosen active fixture dates, placement and ZIP. Rank tier descending: Gold B/C precede Silver A. Compare Gold distance ascending: C 0.8 < B 1.2. Impressions ascending are consulted only after equal tier AND distance; B having 45 impressions does not beat C with 90. Stable ID ascending breaks any remaining tie. Eligible order is C, B, A. Empty eligibility uses an unpaid internal house message.

Only the four tier/distance/impression/status tuples and active-date condition came from the prompt. The fixture uses fixed 2026-10-24, 2026-10-01 through 2026-10-31, radius 5, sidebar, synthetic IDs and reserved example.com URLs; those additional details are test choices, not claimed instructor data.

Actual trace:

```json
{
  "context": {
    "placement": "sidebar",
    "zipCode": "90032",
    "currentDate": "2026-10-24"
  },
  "precedence": [
    "approved/active/placement/date/geography/safe URL eligibility",
    "tier descending",
    "distance ascending",
    "impressions ascending",
    "stable ID ascending"
  ],
  "candidates": [
    {
      "id": "60000000-0000-4000-8000-00000000000a",
      "name": "Sponsor A",
      "eligible": true,
      "reason": "eligible",
      "geography": "exact_zip"
    },
    {
      "id": "60000000-0000-4000-8000-00000000000b",
      "name": "Sponsor B",
      "eligible": true,
      "reason": "eligible",
      "geography": "exact_zip"
    },
    {
      "id": "60000000-0000-4000-8000-00000000000c",
      "name": "Sponsor C",
      "eligible": true,
      "reason": "eligible",
      "geography": "exact_zip"
    },
    {
      "id": "60000000-0000-4000-8000-00000000000d",
      "name": "Sponsor D",
      "eligible": false,
      "reason": "not_approved",
      "geography": "none"
    }
  ],
  "rankedEligibleIds": [
    "60000000-0000-4000-8000-00000000000c",
    "60000000-0000-4000-8000-00000000000b",
    "60000000-0000-4000-8000-00000000000a"
  ],
  "selected": {
    "id": "60000000-0000-4000-8000-00000000000c",
    "name": "Sponsor C",
    "approved": true,
    "active": true,
    "placement": "sidebar",
    "startDate": "2026-10-01",
    "endDate": "2026-10-31",
    "zipCodes": [
      "90032"
    ],
    "coverageRadiusMiles": 5,
    "tier": "Gold",
    "distanceMiles": 0.8,
    "impressions": 90,
    "destinationUrl": "https://example.com/sponsor"
  }
}
```

## Runtime URL validation and exact outputs

```ts
import { isIP } from 'node:net'
import { z } from 'zod'

const blockedSuffixes = [
  '.localhost',
  '.local',
  '.internal',
  '.lan',
  '.home',
  '.corp',
  '.test',
  '.invalid',
  '.example',
  '.onion',
]

export const SponsorDestinationUrlSchema = z
  .string()
  .trim()
  .url()
  .superRefine((value, ctx) => {
    let url: URL

    try {
      url = new URL(value)
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'Destination must be a public HTTPS URL.',
      })
      return
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()

    const isLocalOrReservedHost =
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      blockedSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
      !hostname.includes('.') ||
      hostname.endsWith('.')

    if (
      url.protocol !== 'https:' ||
      url.username !== '' ||
      url.password !== '' ||
      url.port !== '' ||
      isIP(hostname) !== 0 ||
      isLocalOrReservedHost
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Destination must be a public HTTPS URL.',
      })
    }
  })

export function validateSponsorDestination(input: unknown) {
  const result = SponsorDestinationUrlSchema.safeParse(input)
  if (!result.success) {
    return {
      success: false as const,
      error: {
        code: 'UNSAFE_SPONSOR_URL',
        message: 'Destination must be a public HTTPS URL.',
        issues: result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      },
    }
  }
  return { success: true as const, url: new URL(result.data).href }
}
```

Actual valid URL result:

```json
{
  "success": true,
  "url": "https://example.com/approved"
}
```

Actual unsafe URL result:

```json
{
  "success": false,
  "error": {
    "code": "UNSAFE_SPONSOR_URL",
    "message": "Destination must be a public HTTPS URL.",
    "issues": [
      {
        "path": [],
        "message": "Destination must be a public HTTPS URL."
      }
    ]
  }
}
```

Exact client response from the redirect handler with an unsafe stored URL (local helper execution; no URL was fetched):

```json
{
  "status": 502,
  "headers": {
    "cache-control": "no-store",
    "content-type": "application/json",
    "referrer-policy": "strict-origin-when-cross-origin"
  },
  "body": "{\"error\":{\"code\":\"UNSAFE_SPONSOR_URL\",\"message\":\"Destination must be a public HTTPS URL.\",\"issues\":[{\"path\":[],\"message\":\"Destination must be a public HTTPS URL.\"}]}}"
}
```

The handler rejects client-supplied URLs, unknown/repeated query parameters and a sponsor ID that is no longer the selected eligible record. All responses disable caching. HTTPS/host/IP validation is lexical; it does not prove the owner, content, DNS resolution or future behavior of a remote site. No server fetch follows the destination.

## Disclosure JSX and actual DOM render

```tsx
import React from 'react'
import Link from 'next/link'
import { HOUSE_FALLBACK_SPONSOR } from '../lib/sponsorMatcher'
import { sponsorRedirectPath, type PublicSponsor } from '../lib/sponsorRuntime'

export interface SponsorPlacementProps {
  propertyId: string
  targetZip: string
  placement?: string
  sponsor: PublicSponsor | null
}

export default function SponsorPlacement({ propertyId, targetZip, placement = 'sidebar', sponsor }: SponsorPlacementProps) {
  const disclosureId = `sponsor-disclosure-${propertyId}-${placement}`
  return (
    <aside aria-labelledby={disclosureId} className="border border-stone-300 rounded-lg p-4 bg-stone-50 shadow-sm">
      <p id={disclosureId} className="text-sm font-semibold text-stone-800">
        {sponsor ? 'Sponsored — paid local partner' : HOUSE_FALLBACK_SPONSOR.disclosure}
      </p>
      <h3 className="text-lg font-medium text-stone-900 mt-1">{sponsor?.business_name ?? HOUSE_FALLBACK_SPONSOR.name}</h3>
      {sponsor ? (
        <a
          href={sponsorRedirectPath(sponsor.id, propertyId, targetZip, placement)}
          aria-describedby={disclosureId}
          aria-label={`Sponsored partner: visit ${sponsor.business_name} (opens a new tab)`}
          target="_blank" rel="sponsored noopener noreferrer"
          className="mt-3 inline-block underline text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-4"
        >Visit sponsored partner</a>
      ) : (
        <Link href={HOUSE_FALLBACK_SPONSOR.destinationUrl} aria-describedby={disclosureId}
          className="mt-3 inline-block underline text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-4">
          Browse fictional demo listings
        </Link>
      )}
    </aside>
  )
}
```

The visible `Sponsored — paid local partner` paragraph is referenced by the aside and the link. The link accessible name begins `Sponsored partner`, identifies the destination business and announces a new tab. The unpaid fallback explicitly says `House message - no paid sponsor`. Static output is preserved in `evidence/lab6-disclosure-markup.html`. DOM assertions check the visible disclosure, `aria-label`, `aria-describedby` and `rel`. These checks alone do not establish FTC or WCAG compliance.

## Verification limits

Focused test output is in `evidence/lab6-tests.txt`; actual selection, URL, redirect and coarse impression results are in `evidence/lab6-actual-results.json`. The coordinating backend agent executed the exact migration and fixture against disposable local PostgreSQL in PGlite for UUID and historical TEXT/company_name-NOT-NULL schema families. Both returned C, B, A with D excluded; actual outer and inner EXPLAIN plans, permission denials, coarse event insertion and counter increment are recorded in `backend-evidence/local-sponsor-results.json`. See the decision note for the execution limits. No cloud migration or sponsor click is part of this evidence. The required ChatGPT-and-Gemini critique, human partner review and course submission remain separate actions; Codex output is not labeled as either required tool run.
