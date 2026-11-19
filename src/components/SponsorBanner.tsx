import { recordSponsorImpression } from '../actions/record-sponsor-impression'
import { getActiveSponsorForProperty } from '../actions/get-sponsor'
import SponsorPlacement from './SponsorPlacement'
import type { SponsorBannerProps } from '../types'

export default async function SponsorBanner({ propertyId, targetZip, placement = 'sidebar', pageContext = 'home' }: SponsorBannerProps) {
  const sponsor = await getActiveSponsorForProperty(propertyId, targetZip, placement)
  if (sponsor) await recordSponsorImpression({ sponsorId: sponsor.id, placement, pageContext })
  return <SponsorPlacement propertyId={propertyId} targetZip={targetZip} placement={placement} sponsor={sponsor} />
}
