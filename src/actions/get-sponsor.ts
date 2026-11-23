import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { selectSponsor } from '../lib/sponsorMatcher'
import { SponsorContextSchema, SponsorIdSchema } from '../lib/sponsorRuntime'

function publicConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY
  return url && key ? { url, key } : null
}
export function hasSponsorBackendConfiguration() { return publicConfiguration() !== null }
const Numeric = z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]).transform(Number).pipe(z.number().finite().nonnegative())
const CandidateRow = z.object({
  id: SponsorIdSchema, business_name: z.string().min(1), destination_url: z.string(),
  status: z.literal('APPROVED'), is_active: z.literal(true), placement: z.string(),
  start_date: z.string(), end_date: z.string(), target_zip_codes: z.array(z.string()),
  coverage_radius_miles: Numeric, tier: z.enum(['Platinum', 'Gold', 'Silver']),
  impression_count: Numeric.pipe(z.number().int().max(Number.MAX_SAFE_INTEGER)), distance_miles: Numeric,
})

export async function getActiveSponsorForProperty(
  propertyId: string, targetZip: string, placement = 'sidebar',
  clock: () => Date = () => new Date(),
) {
  const parsed = SponsorContextSchema.safeParse({ propertyId, targetZip, placement })
  const config = publicConfiguration()
  if (!parsed.success || !config) return null
  const supabase = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } })
  // SQL applies CURRENT_DATE and geography before returning narrow public fields.
  const { data, error } = await supabase.rpc('eligible_sponsors_for_property', {
    p_property_id: parsed.data.propertyId, p_zip: parsed.data.targetZip, p_placement: parsed.data.placement,
  })
  if (error) {
    console.error('Sponsor eligibility query unavailable.')
    return null
  }
  const candidates = (Array.isArray(data) ? data : []).flatMap((input: unknown) => {
    const row = CandidateRow.safeParse(input)
    if (!row.success) return []
    return [{
      id: row.data.id, name: row.data.business_name, destinationUrl: row.data.destination_url,
      approved: true, active: true, placement: row.data.placement,
      startDate: row.data.start_date, endDate: row.data.end_date, zipCodes: row.data.target_zip_codes,
      coverageRadiusMiles: row.data.coverage_radius_miles, tier: row.data.tier,
      distanceMiles: row.data.distance_miles, impressions: row.data.impression_count,
    }]
  })
  const selected = selectSponsor({ placement, zipCode: targetZip, currentDate: clock().toISOString().slice(0, 10) }, candidates)
  return selected ? { id: selected.id, business_name: selected.name, destination_url: selected.destinationUrl } : null
}
