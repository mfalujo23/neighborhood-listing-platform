import 'server-only'
import { z } from 'zod'
import { traceSponsorSelection, type SponsorCandidate } from '../../lib/sponsorMatcher'
import { LivePropertyInput, LiveSponsorInput } from './contracts'

export const VOICE_QUERY_TIMEOUT_MS = 2500
export const PROPERTY_PROJECTION = 'id,title,description,street,city,state,zip_code,price,bedrooms,bathrooms,square_feet,amenities,approved'
const MAX_RESPONSE_BYTES = 64 * 1024
const numeric = z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]).transform(Number).pipe(z.number().finite().nonnegative())
const PropertyRow = z.strictObject({
  id: z.uuid(), title: z.string().min(1).max(300), description: z.string().max(10000).nullable(),
  street: z.string().min(1).max(300), city: z.string().min(1).max(160),
  state: z.string().regex(/^[A-Z]{2}$/), zip_code: z.string().regex(/^\d{5}(-\d{4})?$/),
  price: numeric, bedrooms: z.number().int().nonnegative(), bathrooms: numeric,
  square_feet: z.number().int().nonnegative(), amenities: z.array(z.string().max(300)).max(100),
  approved: z.literal(true),
})
const SponsorRow = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/),
  business_name: z.string().min(1).max(300), destination_url: z.string().max(2048),
  status: z.literal('APPROVED'), is_active: z.literal(true), placement: z.literal('sidebar'),
  start_date: z.string(), end_date: z.string(), target_zip_codes: z.array(z.string()).max(500),
  coverage_radius_miles: numeric, tier: z.enum(['Platinum', 'Gold', 'Silver']),
  impression_count: numeric.pipe(z.number().int().max(Number.MAX_SAFE_INTEGER)), distance_miles: numeric,
})

export class VoiceDataError extends Error {
  constructor(public status: 404 | 503 | 504, public code: 'NOT_FOUND' | 'UNAVAILABLE' | 'TIMEOUT') {
    super(code)
  }
}

export function isPublicSupabaseKey(key: string) {
  if (/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) return true
  if (key.length > 4096 || key.split('.').length !== 3) return false
  try {
    const claims: unknown = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'))
    return typeof claims === 'object' && claims !== null && 'role' in claims && claims.role === 'anon'
  } catch { return false }
}

async function boundedJson(response: Response) {
  if (Number(response.headers.get('content-length') ?? 0) > MAX_RESPONSE_BYTES) throw new VoiceDataError(503, 'UNAVAILABLE')
  const reader = response.body?.getReader()
  if (!reader) throw new VoiceDataError(503, 'UNAVAILABLE')
  const chunks: Uint8Array[] = []
  let length = 0
  for (;;) {
    const part = await reader.read()
    if (part.done) break
    length += part.value.byteLength
    if (length > MAX_RESPONSE_BYTES) {
      await reader.cancel()
      throw new VoiceDataError(503, 'UNAVAILABLE')
    }
    chunks.push(part.value)
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))) as unknown
}

export function createVoiceDatabase({
  url, publishableKey, fetchImpl = fetch, timeoutMs = VOICE_QUERY_TIMEOUT_MS,
  clock = () => new Date(),
}: {
  url: string; publishableKey: string; fetchImpl?: typeof fetch; timeoutMs?: number; clock?: () => Date
}) {
  const origin = new URL(url)
  const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(origin.hostname)
  if ((origin.protocol !== 'https:' && !(origin.protocol === 'http:' && loopback))
    || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/'
    || !isPublicSupabaseKey(publishableKey)) throw new VoiceDataError(503, 'UNAVAILABLE')
  const headers: Record<string, string> = { apikey: publishableKey, Accept: 'application/json' }
  // A publishable key is not a JWT. Legacy anon JWTs additionally supply Bearer.
  if (!publishableKey.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${publishableKey}`

  async function query(endpoint: URL, body?: unknown) {
    const signal = AbortSignal.timeout(timeoutMs)
    try {
      const response = await fetchImpl(endpoint, {
        method: body === undefined ? 'GET' : 'POST', headers: { ...headers, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal, redirect: 'error', cache: 'no-store',
      })
      if (!response.ok) throw new VoiceDataError(503, 'UNAVAILABLE')
      return await boundedJson(response)
    } catch (error) {
      if (signal.aborted) throw new VoiceDataError(504, 'TIMEOUT')
      if (error instanceof VoiceDataError) throw error
      throw new VoiceDataError(503, 'UNAVAILABLE')
    }
  }

  async function property(input: unknown) {
    const { property_id } = LivePropertyInput.parse(input)
    const endpoint = new URL('/rest/v1/properties', origin)
    endpoint.search = new URLSearchParams({ select: PROPERTY_PROJECTION, id: `eq.${property_id}`, approved: 'eq.true', limit: '1' }).toString()
    const rows = z.array(PropertyRow).max(1).safeParse(await query(endpoint))
    if (!rows.success) throw new VoiceDataError(503, 'UNAVAILABLE')
    if (rows.data.length === 0) throw new VoiceDataError(404, 'NOT_FOUND')
    if (rows.data[0].id.toLowerCase() !== property_id.toLowerCase()) throw new VoiceDataError(503, 'UNAVAILABLE')
    const { approved: _approved, description, ...publicFacts } = rows.data[0]
    void _approved
    // The current SQL permits a missing description. Omit it instead of
    // fabricating text or rejecting an otherwise valid approved property.
    return { ...publicFacts, ...(description === null ? {} : { description }) }
  }

  async function sponsors(input: unknown) {
    const args = LiveSponsorInput.parse(input)
    const listing = await property({ property_id: args.property_id })
    if (listing.zip_code.slice(0, 5) !== args.zip) throw new VoiceDataError(404, 'NOT_FOUND')
    const data = await query(new URL('/rest/v1/rpc/eligible_sponsors_for_property', origin), {
      p_property_id: args.property_id, p_zip: args.zip, p_placement: 'sidebar',
    })
    const parsed = z.array(SponsorRow).max(100).safeParse(data)
    if (!parsed.success) throw new VoiceDataError(503, 'UNAVAILABLE')
    const candidates: SponsorCandidate[] = parsed.data.map(row => ({
      id: row.id, name: row.business_name, destinationUrl: row.destination_url,
      approved: true, active: true, placement: row.placement, startDate: row.start_date,
      endDate: row.end_date, zipCodes: row.target_zip_codes, coverageRadiusMiles: row.coverage_radius_miles,
      tier: row.tier, distanceMiles: row.distance_miles, impressions: row.impression_count,
    }))
    const ranked = traceSponsorSelection({ placement: 'sidebar', zipCode: args.zip, currentDate: clock().toISOString().slice(0, 10) }, candidates).rankedEligibleIds
    return {
      sponsors: ranked.slice(0, 3).map(id => ({ id, name: candidates.find(row => row.id === id)!.name })),
      disclosure: 'Sponsored placements are advertising, separate from property facts.',
    }
  }
  return { property, sponsors }
}
export type VoiceDatabase = ReturnType<typeof createVoiceDatabase>

