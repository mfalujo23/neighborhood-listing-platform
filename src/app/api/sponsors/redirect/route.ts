import { getActiveSponsorForProperty, hasSponsorBackendConfiguration } from '@/actions/get-sponsor'
import { handleSponsorRedirect } from '@/lib/sponsorRuntime'

export const runtime = 'nodejs'
export async function GET(request: Request) {
  return handleSponsorRedirect(request, async (propertyId, zip, placement) => {
    if (!hasSponsorBackendConfiguration()) throw new Error('Sponsor backend unavailable.')
    return getActiveSponsorForProperty(propertyId, zip, placement)
  })
}
