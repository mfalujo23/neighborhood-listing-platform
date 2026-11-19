import { AnalyticsEventSchema, type AnalyticsEvent } from './schema'

export const RETENTION_DAYS = 30
export class FictionalAnalyticsStore {
  private records = new Map<string, AnalyticsEvent>()
  private consent = false
  constructor(private clock: () => Date = () => new Date()) {}
  setConsent(value: boolean) { this.consent = value; if (!value) this.records.clear() }
  deleteAll() { this.records.clear(); this.consent = false }
  private purge() {
    const cutoff = this.clock().getTime() - RETENTION_DAYS * 86400000
    for (const [id, record] of this.records) if (Date.parse(record.occurredAt) < cutoff) this.records.delete(id)
  }
  ingest(input: unknown) {
    if (!this.consent) return { status: 'disabled' as const }
    const parsed = AnalyticsEventSchema.safeParse(input)
    if (!parsed.success) return { status: 'invalid' as const, code: 'INVALID_EVENT_SHAPE' }
    const record = parsed.data
    if (record.source !== 'fixture') return { status: 'invalid' as const, code: 'FICTIONAL_MODE_ONLY' }
    const age = this.clock().getTime() - Date.parse(record.occurredAt)
    if (age < -120000 || age > RETENTION_DAYS * 86400000) return { status: 'invalid' as const, code: 'OUTSIDE_RETENTION_WINDOW' }
    this.purge()
    const previous = this.records.get(record.eventId)
    if (previous) return JSON.stringify(previous) === JSON.stringify(record) ? { status: 'duplicate' as const } : { status: 'conflict' as const }
    if (this.records.size >= 2000) return { status: 'unavailable' as const, code: 'LOCAL_CAPACITY_REACHED' }
    if (record.name === 'sponsor_click') {
      const impression = this.records.get(record.properties.impressionId)
      if (!impression || impression.name !== 'sponsor_impression' || impression.propertyId !== record.propertyId || impression.correlationId !== record.correlationId) return { status: 'invalid' as const, code: 'UNMATCHED_IMPRESSION' }
    }
    this.records.set(record.eventId, record)
    return { status: 'accepted' as const }
  }
  events() { this.purge(); return [...this.records.values()] }
}
