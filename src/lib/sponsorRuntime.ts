import { z } from 'zod'
import { validateSponsorDestination } from './sponsorUrl'

export const SponsorContextSchema = z.object({
  propertyId: z.string().uuid(),
  targetZip: z.string().regex(/^[0-9]{5}(-[0-9]{4})?$/),
  placement: z.string().regex(/^[a-z][a-z0-9_-]{0,79}$/),
}).strict()

// Historical schemas contain both UUID and TEXT sponsor IDs; never cast stored IDs.
export const SponsorIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/)

export const SponsorImpressionSchema = z.object({
  sponsorId: SponsorIdSchema,
  placement: z.string().regex(/^[a-z][a-z0-9_-]{0,79}$/),
  pageContext: z.enum(['home', 'property_detail', 'services']),
}).strict()

export function createCoarseImpression(input: unknown, clock: () => Date = () => new Date()) {
  const parsed = SponsorImpressionSchema.safeParse(input)
  if (!parsed.success) return null
  return { ...parsed.data, timestamp: clock().toISOString() }
}

export interface PublicSponsor { id: string; business_name: string; destination_url: string }

export function sponsorRedirectPath(sponsorId: string, propertyId: string, zip: string, placement: string) {
  return `/api/sponsors/redirect?${new URLSearchParams({ sponsor_id: sponsorId, property_id: propertyId, zip, placement })}`
}

const RedirectQuerySchema = z.object({
  sponsor_id: SponsorIdSchema, property_id: z.string().uuid(),
  zip: z.string().regex(/^[0-9]{5}(-[0-9]{4})?$/),
  placement: z.string().regex(/^[a-z][a-z0-9_-]{0,79}$/),
}).strict()
type Lookup = (propertyId: string, zip: string, placement: string) => Promise<PublicSponsor | null>
const responseHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'strict-origin-when-cross-origin' }

export async function handleSponsorRedirect(request: Request, lookup: Lookup) {
  const params = new URL(request.url).searchParams
  const parsed = RedirectQuerySchema.safeParse(Object.fromEntries(params))
  if (!parsed.success || [...params.keys()].some((key) => params.getAll(key).length !== 1)) {
    return Response.json({ error: { code: 'INVALID_SPONSOR_CONTEXT', message: 'Valid sponsor_id, property_id, zip and placement are required.' } }, { status: 400, headers: responseHeaders })
  }
  let selected: PublicSponsor | null
  try {
    selected = await lookup(parsed.data.property_id, parsed.data.zip, parsed.data.placement)
  } catch {
    return Response.json({ error: { code: 'SPONSOR_LOOKUP_UNAVAILABLE', message: 'Sponsor verification is unavailable.' } }, { status: 503, headers: responseHeaders })
  }
  // Recompute approval/geography/date and selection at click time; never accept a client URL.
  if (!selected || selected.id !== parsed.data.sponsor_id) {
    return Response.json({ error: { code: 'SPONSOR_NOT_ELIGIBLE', message: 'Sponsor is not eligible for this placement.' } }, { status: 404, headers: responseHeaders })
  }
  const validated = validateSponsorDestination(selected.destination_url)
  if (!validated.success) return Response.json({ error: validated.error }, { status: 502, headers: responseHeaders })
  return new Response(null, { status: 302, headers: { ...responseHeaders, Location: validated.url } })
}
