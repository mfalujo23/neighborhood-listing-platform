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
