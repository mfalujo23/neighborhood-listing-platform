import type { AnalyticsEvent } from './schema'

export const DEMO_CLOCK = '2026-11-18T12:00:00Z'
export const DEMO_PROPERTIES = [
  { id: '70000000-0000-4000-8000-000000000001', label: 'Fictional property A' },
  { id: '70000000-0000-4000-8000-000000000002', label: 'Fictional property B' },
]
const uuid = (n: number) => `70000000-0000-4000-8000-${n.toString().padStart(12, '0')}`
export function fictionalAnalyticsEvents(): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = []
  let id = 100
  const add = (session: number, name: AnalyticsEvent['name'], properties: AnalyticsEvent['properties'], day = '17') => {
    events.push({ eventId: uuid(id++), occurredAt: `2026-11-${day}T12:00:00Z`, propertyId: DEMO_PROPERTIES[session === 4 ? 1 : 0].id, correlationId: uuid(50 + session), source: 'fixture', name, properties } as AnalyticsEvent)
  }
  for (let session = 1; session <= 4; session++) {
    add(session, 'listing_view', {})
    add(session, 'filter_used', { filter: 'bedrooms' })
    const impressionId = uuid(id)
    add(session, 'sponsor_impression', { sponsorId: 'fictional-sponsor-a', neighborhood: '90032' })
    if (session <= 2) add(session, 'sponsor_click', { impressionId })
    add(session, 'call_started', {})
    add(session, 'intent_category', { category: session === 4 ? 'unknown' : 'property_details' })
    add(session, 'tool_success', { tool: 'get_property_details', success: session !== 3 })
    if (session === 3) add(session, 'escalation', { reason: 'webhook_timeout' })
    if (session !== 4) add(session, 'call_completed', { outcome: session === 3 ? 'unresolved' : 'resolved', pipelineLatencyMs: [800, 999, 1000][session - 1] }, session === 2 ? '18' : '17')
  }
  return events
}
