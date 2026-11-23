import { z } from 'zod'

const safeId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/)
const common = {
  eventId: z.string().uuid(), occurredAt: z.iso.datetime({ offset: true }),
  propertyId: z.string().uuid(), correlationId: z.string().uuid(),
  source: z.enum(['fixture', 'provider_measured']),
}
const event = <N extends string, P extends z.ZodRawShape>(name: N, properties: P) => z.object({ ...common, name: z.literal(name), properties: z.object(properties).strict() }).strict()
export const AnalyticsEventSchema = z.discriminatedUnion('name', [
  event('listing_view', {}),
  event('filter_used', { filter: z.enum(['zip', 'price', 'bedrooms']) }),
  event('sponsor_impression', { sponsorId: safeId, neighborhood: z.string().regex(/^\d{5}$/) }),
  event('sponsor_click', { impressionId: z.string().uuid() }),
  event('call_started', {}),
  event('intent_category', { category: z.enum(['property_details', 'availability', 'booking', 'sponsor_info', 'unknown']) }),
  event('tool_success', { tool: z.enum(['get_property_details', 'get_nearby_sponsors', 'request_agent_followup']), success: z.boolean() }),
  event('escalation', { reason: z.enum(['webhook_timeout', 'fallback_transfer', 'human_requested', 'tool_failure', 'unknown_fact']) }),
  event('call_completed', { outcome: z.enum(['resolved', 'unresolved', 'abandoned']), pipelineLatencyMs: z.number().int().min(0).max(60000).optional() }),
])
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, 'A real calendar date is required.')
export const AnalyticsFilterSchema = z.object({ from: dateOnly, through: dateOnly, propertyId: z.string().uuid().optional() }).strict().refine((value) => value.from <= value.through, 'Start date must not follow end date.')
export type AnalyticsFilter = z.infer<typeof AnalyticsFilterSchema>
export function utcBounds(filter: AnalyticsFilter) {
  return { start: new Date(`${filter.from}T00:00:00Z`).toISOString(), endExclusive: new Date(Date.parse(`${filter.through}T00:00:00Z`) + 86400000).toISOString() }
}
