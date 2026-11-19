import 'server-only'

import { getSupabaseAdmin } from '../lib/supabase-server'
import { createCoarseImpression } from '../lib/sponsorRuntime'

export async function recordSponsorImpression(input: unknown) {
  // Disabled by default: rendering local fixtures must not write to any backend.
  if (process.env.ENABLE_SPONSOR_IMPRESSIONS !== 'true') return
  const event = createCoarseImpression(input)
  if (!event) return
  try {
    const { error } = await getSupabaseAdmin().rpc('record_sponsor_placement_impression', {
      p_sponsor_id: event.sponsorId, p_placement: event.placement, p_page_context: event.pageContext,
    })
    // Database generates timestamp; no IP, user ID, address or free text is sent.
    if (error) console.error('Sponsor impression unavailable.')
  } catch {
    console.error('Sponsor impression unavailable.')
  }
}
