import { AnalyticsEventSchema, AnalyticsFilterSchema, utcBounds, type AnalyticsEvent, type AnalyticsFilter } from './schema'

export interface Metric { numerator: number; denominator: number; percent: number | null; definition: string }
const rate = (numerator: number, denominator: number, definition: string): Metric => ({ numerator, denominator, percent: denominator >= 3 ? numerator / denominator * 100 : null, definition })
const key = (event: AnalyticsEvent) => `${event.propertyId}:${event.correlationId}`
export function aggregateAnalytics(input: AnalyticsEvent[], filter: AnalyticsFilter, latencySource: 'fixture' | 'provider_measured' = 'provider_measured') {
  const validated = AnalyticsFilterSchema.parse(filter)
  const bounds = utcBounds(validated)
  const start = Date.parse(bounds.start); const end = Date.parse(bounds.endExclusive)
  const unique = new Map<string, AnalyticsEvent>()
  for (const raw of input) {
    // Parsing validates the complete event and gives equivalent object keys a
    // stable schema order before comparing duplicate IDs.
    const event = AnalyticsEventSchema.parse(raw)
    const previous = unique.get(event.eventId)
    if (previous && JSON.stringify(previous) !== JSON.stringify(event)) throw new Error('Conflicting event IDs.')
    unique.set(event.eventId, event)
  }
  const events = [...unique.values()].filter((item) => Date.parse(item.occurredAt) >= start && Date.parse(item.occurredAt) < end && (!validated.propertyId || validated.propertyId === item.propertyId))
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.eventId.localeCompare(b.eventId))
  const impressions = new Map(events.filter((item) => item.name === 'sponsor_impression').map((item) => [item.eventId, item]))
  const clicked = new Set(events.flatMap((item) => {
    if (item.name !== 'sponsor_click') return []
    const parent = impressions.get(item.properties.impressionId)
    return parent && parent.propertyId === item.propertyId && parent.correlationId === item.correlationId ? [parent.eventId] : []
  }))
  const started = new Set(events.filter((item) => item.name === 'call_started').map(key))
  const completed = new Map(events.filter((item) => item.name === 'call_completed' && started.has(key(item))).map((item) => [key(item), item]))
  const escalated = new Set(events.filter((item) => item.name === 'escalation' && started.has(key(item))).map(key))
  const fallback = new Set(events.filter((item) => item.name === 'escalation' && ['webhook_timeout', 'fallback_transfer'].includes(item.properties.reason) && started.has(key(item))).map(key))
  const resolved = [...completed.values()].filter((item) => item.name === 'call_completed' && item.properties.outcome === 'resolved' && !escalated.has(key(item)))
  const views = new Set(events.filter((item) => item.name === 'listing_view').map(key))
  const inquiries = new Set(events.filter((item) => item.name === 'intent_category' && ['property_details', 'availability', 'booking'].includes(item.properties.category) && views.has(key(item))).map(key))
  const latency = [...completed.values()].filter((item) => item.name === 'call_completed' && item.source === latencySource && item.properties.pipelineLatencyMs !== undefined)
  const withinSla = latency.filter((item) => item.name === 'call_completed' && (item.properties.pipelineLatencyMs ?? Infinity) < 1000)
  const tools = events.filter((item) => item.name === 'tool_success')
  const neighborhoods = new Map<string, { impressions: number; clickedImpressions: number }>()
  for (const impression of impressions.values()) {
    if (impression.name !== 'sponsor_impression') continue
    const group = neighborhoods.get(impression.properties.neighborhood) ?? { impressions: 0, clickedImpressions: 0 }
    group.impressions++; if (clicked.has(impression.eventId)) group.clickedImpressions++
    neighborhoods.set(impression.properties.neighborhood, group)
  }
  const days = new Map<string, number>(); const categories = new Map<string, number>()
  for (const item of events) {
    const day = new Date(item.occurredAt).toISOString().slice(0, 10)
    days.set(day, (days.get(day) ?? 0) + 1)
    if (item.name === 'intent_category') categories.set(item.properties.category, (categories.get(item.properties.category) ?? 0) + 1)
  }
  return {
    eventCount: events.length, bounds, latencySource,
    metrics: {
      sponsorCtr: rate(clicked.size, impressions.size, 'Distinct matched impression IDs clicked / distinct impression IDs in the UTC window.'),
      inquiryCompletion: rate(resolved.length, started.size, 'Started property/correlation sessions resolved without escalation / started sessions. Successful-inquiry proxy; no caller identity or first-call history.'),
      webhookFallback: rate(fallback.size, started.size, 'Started sessions with webhook_timeout or fallback_transfer / started sessions.'),
      propertyInquiry: rate(inquiries.size, views.size, 'Listing-view sessions with a property-details, availability or booking intent / listing-view sessions.'),
      latencySla: rate(withinSla.length, latency.length, `Completed sessions with supplied ${latencySource} latency <1000ms / completed sessions with that latency source. Missing measurements excluded.`),
      callCompletion: rate(completed.size, started.size, 'Started sessions with a completion event / started sessions.'),
      toolSuccess: rate(tools.filter((item) => item.name === 'tool_success' && item.properties.success).length, tools.length, 'Successful tool-result events / all tool-result events.'),
      escalation: rate(escalated.size, started.size, 'Started sessions with any escalation / started sessions.'),
    },
    daily: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count })),
    categories: [...categories].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([category, count]) => ({ category, count })),
    neighborhoods: [...neighborhoods].sort(([a], [b]) => a.localeCompare(b)).map(([neighborhood, counts]) => ({ neighborhood, ...counts, percent: counts.impressions >= 3 ? counts.clickedImpressions / counts.impressions * 100 : null })),
  }
}
export type AnalyticsSummary = ReturnType<typeof aggregateAnalytics>
