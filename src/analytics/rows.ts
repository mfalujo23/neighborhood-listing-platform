import { AnalyticsEventSchema, type AnalyticsEvent } from './schema'

export function eventToColumns(event: AnalyticsEvent) {
  const columns = {
    event_id: event.eventId, event_name: event.name, occurred_at: new Date(event.occurredAt).toISOString(),
    property_id: event.propertyId, correlation_id: event.correlationId, source: event.source,
    filter_key: null as string | null, sponsor_id: null as string | null, neighborhood: null as string | null,
    impression_id: null as string | null, intent_category: null as string | null,
    tool_name: null as string | null, tool_success: null as boolean | null,
    escalation_reason: null as string | null, completion_outcome: null as string | null,
    pipeline_latency_ms: null as number | null,
  }
  if (event.name === 'filter_used') columns.filter_key = event.properties.filter
  if (event.name === 'sponsor_impression') { columns.sponsor_id = event.properties.sponsorId; columns.neighborhood = event.properties.neighborhood }
  if (event.name === 'sponsor_click') columns.impression_id = event.properties.impressionId
  if (event.name === 'intent_category') columns.intent_category = event.properties.category
  if (event.name === 'tool_success') { columns.tool_name = event.properties.tool; columns.tool_success = event.properties.success }
  if (event.name === 'escalation') columns.escalation_reason = event.properties.reason
  if (event.name === 'call_completed') { columns.completion_outcome = event.properties.outcome; columns.pipeline_latency_ms = event.properties.pipelineLatencyMs ?? null }
  return columns
}
export function columnsToEvent(row: Record<string, unknown>): AnalyticsEvent {
  const properties: Record<string, unknown> = {}
  if (row.event_name === 'filter_used') properties.filter = row.filter_key
  if (row.event_name === 'sponsor_impression') { properties.sponsorId = row.sponsor_id; properties.neighborhood = row.neighborhood }
  if (row.event_name === 'sponsor_click') properties.impressionId = row.impression_id
  if (row.event_name === 'intent_category') properties.category = row.intent_category
  if (row.event_name === 'tool_success') { properties.tool = row.tool_name; properties.success = row.tool_success }
  if (row.event_name === 'escalation') properties.reason = row.escalation_reason
  if (row.event_name === 'call_completed') { properties.outcome = row.completion_outcome; if (row.pipeline_latency_ms != null) properties.pipelineLatencyMs = row.pipeline_latency_ms }
  return AnalyticsEventSchema.parse({ eventId: row.event_id, name: row.event_name, occurredAt: row.occurred_at, propertyId: row.property_id, correlationId: row.correlation_id, source: row.source, properties })
}
