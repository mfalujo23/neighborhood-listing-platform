import { z } from 'zod'
import { AnalyticsEventSchema, AnalyticsFilterSchema, type AnalyticsEvent, type AnalyticsFilter } from './schema'
import type { AnalyticsSummary } from './metrics'

export type AnalyticsPrincipal = { userId: string; role: 'admin' | 'provider' | 'property_professional' }
export type AuthorizationResult = { principal: AnalyticsPrincipal } | { denied: 401 | 403 | 503 }
export interface AnalyticsDependencies {
  authorize: (headers: Headers) => Promise<AuthorizationResult>
  enabled: () => boolean
  read: (principal: AnalyticsPrincipal, filter: AnalyticsFilter) => Promise<AnalyticsSummary>
  write: (principal: AnalyticsPrincipal, event: AnalyticsEvent) => Promise<'accepted' | 'duplicate' | 'conflict' | 'forbidden'>
  clock: () => Date
}
const headers = { 'Cache-Control': 'no-store', Vary: 'Authorization', 'Referrer-Policy': 'no-referrer' }
const error = (status: number, code: string) => Response.json({ error: { code } }, { status, headers })
async function body(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error('content_type')
  if (Number(request.headers.get('content-length') ?? 0) > 8192) throw new Error('oversize')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('json')
  let size = 0; const chunks: Uint8Array[] = []
  for (;;) {
    const part = await reader.read()
    if (part.done) break
    size += part.value.length
    if (size > 8192) { await reader.cancel(); throw new Error('oversize') }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes))
}
async function gate(request: Request, dependencies: AnalyticsDependencies) {
  if (request.method !== 'POST') return { response: new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } }) }
  if (new URL(request.url).searchParams.size) return { response: error(400, 'FILTERS_MUST_USE_BODY') }
  try {
    const authorization = await dependencies.authorize(request.headers)
    if ('denied' in authorization) return { response: error(authorization.denied, 'ANALYTICS_ACCESS_DENIED') }
    if (!dependencies.enabled()) return { response: error(503, 'ANALYTICS_DISABLED') }
    return { principal: authorization.principal }
  } catch { return { response: error(503, 'ANALYTICS_UNAVAILABLE') } }
}
async function parsedBody(request: Request) {
  try { return { input: await body(request) } }
  catch (failure) {
    const reason = failure instanceof Error ? failure.message : ''
    return { response: error(reason === 'oversize' ? 413 : reason === 'content_type' ? 415 : 400, 'INVALID_ANALYTICS_REQUEST') }
  }
}
export async function handleAnalyticsSummary(request: Request, dependencies: AnalyticsDependencies) {
  const access = await gate(request, dependencies)
  if (access.response) return access.response
  const payload = await parsedBody(request)
  if (payload.response) return payload.response
  const filter = AnalyticsFilterSchema.safeParse(payload.input)
  if (!filter.success) return error(400, 'INVALID_ANALYTICS_FILTER')
  try { return Response.json({ data: await dependencies.read(access.principal!, filter.data) }, { headers }) }
  catch { return error(503, 'ANALYTICS_UNAVAILABLE') }
}
const IngestionSchema = z.object({ consent: z.literal(true), event: AnalyticsEventSchema }).strict()
export async function handleAnalyticsEvent(request: Request, dependencies: AnalyticsDependencies) {
  const access = await gate(request, dependencies)
  if (access.response) return access.response
  const payload = await parsedBody(request)
  if (payload.response) return payload.response
  const parsed = IngestionSchema.safeParse(payload.input)
  if (!parsed.success) return error(400, 'INVALID_EVENT_OR_CONSENT')
  // This coursework route is a fixture ingress. No provider integration is asserted.
  if (parsed.data.event.source !== 'fixture') return error(400, 'FIXTURE_INGRESS_ONLY')
  const age = dependencies.clock().getTime() - Date.parse(parsed.data.event.occurredAt)
  if (age < -120000 || age > 30 * 86400000) return error(400, 'OUTSIDE_RETENTION_WINDOW')
  try {
    const result = await dependencies.write(access.principal!, parsed.data.event)
    return result === 'forbidden' ? error(403, 'PROPERTY_ACCESS_DENIED')
      : result === 'conflict' ? error(409, 'EVENT_ID_CONFLICT')
        : Response.json({ status: result }, { status: result === 'accepted' ? 201 : 200, headers })
  } catch { return error(503, 'ANALYTICS_UNAVAILABLE') }
}
