'use client'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { DEMO_CLOCK, DEMO_PROPERTIES, fictionalAnalyticsEvents } from '../../analytics/fixtures'
import { aggregateAnalytics } from '../../analytics/metrics'
import { AnalyticsFilterSchema, type AnalyticsEvent, type AnalyticsFilter } from '../../analytics/schema'
import { FictionalAnalyticsStore } from '../../analytics/store'
import SummaryView from '../../analytics/SummaryView'
import styles from './dashboard.module.css'

export default function DashboardDemo() {
  const store = useRef(new FictionalAnalyticsStore(() => new Date(DEMO_CLOCK)))
  const [consent, setConsent] = useState(false)
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [filter, setFilter] = useState<AnalyticsFilter>({ from: '2026-11-17', through: '2026-11-18' })
  const [draft, setDraft] = useState({ from: '2026-11-17', through: '2026-11-18', propertyId: '' })
  const [status, setStatus] = useState('Fictional telemetry is off. The dashboard starts empty.')
  const [error, setError] = useState('')
  const [failure, setFailure] = useState(false)
  const refresh = () => setEvents(store.current.events())
  const summary = aggregateAnalytics(events, filter, 'fixture')
  function load() {
    const outcomes = fictionalAnalyticsEvents().map((event) => store.current.ingest(event))
    setStatus(`Fixture load: ${outcomes.filter((item) => item.status === 'accepted').length} accepted; ${outcomes.filter((item) => item.status === 'duplicate').length} duplicates ignored.`)
    refresh()
  }
  function addClick() {
    const impression = fictionalAnalyticsEvents().filter((event) => event.name === 'sponsor_impression')[2]
    const click: AnalyticsEvent = { eventId: '70000000-0000-4000-8000-000000000900', occurredAt: '2026-11-18T11:59:00Z', propertyId: impression.propertyId, correlationId: impression.correlationId, source: 'fixture', name: 'sponsor_click', properties: { impressionId: impression.eventId } }
    const result = store.current.ingest(click)
    setStatus(`Fictional click: ${result.status}. Repeating this action uses the same event ID.`)
    refresh()
  }
  function duplicate() {
    const first = events[0]
    setStatus(first ? `Repeated event: ${store.current.ingest(first).status}; counts do not increase.` : 'Load fictional events before repeating an event.')
    refresh()
  }
  function applyFilters() {
    const parsed = AnalyticsFilterSchema.safeParse({ from: draft.from, through: draft.through, ...(draft.propertyId ? { propertyId: draft.propertyId } : {}) })
    if (!parsed.success) { setError('Choose valid dates with the start on or before the end.'); return }
    setFilter(parsed.data); setError(''); setStatus('Filters applied in memory; the URL is unchanged.')
  }
  return <main className={styles.main}>
    <nav><Link href="/">Home</Link><Link href="/listings">Fictional listings</Link><Link href="/voice-simulator">Voice mock</Link></nav>
    <header><p className={styles.eyebrow}>Fictional sample data</p><h1>Privacy-focused dashboard demo</h1>
      <p>This public demonstration uses prewritten fictional events in volatile browser memory. No model, real call, user study or provider latency was measured. The protected analytics route is separate.</p>
    </header>
    <section className={styles.panel} aria-labelledby="controls-title"><h2 id="controls-title">Try the event pipeline</h2>
      <p>Demo clock: {DEMO_CLOCK}. Refreshing or revoking permission clears the local dataset. This checkbox is permission for fictional demo events, not participant consent for a user study.</p>
      <label className={styles.check}><input type="checkbox" checked={consent} onChange={(event) => { const checked = event.target.checked; setConsent(checked); store.current.setConsent(checked); refresh(); setStatus(checked ? 'Fictional telemetry enabled for this page only.' : 'Permission revoked; local events deleted.'); }} />Allow in-memory fictional telemetry (optional)</label>
      <div className={styles.buttons}>
        <button onClick={load} disabled={!consent}>Load fictional events</button><button onClick={addClick} disabled={!consent || events.length === 0}>Add one fictional sponsor click</button>
        <button onClick={duplicate} disabled={!consent || events.length === 0}>Repeat first event</button>
        <button onClick={() => { store.current.deleteAll(); setConsent(false); refresh(); setStatus('Deleted all local events; permission is off.'); }}>Revoke and delete local data</button>
        <button onClick={() => setFailure(!failure)} aria-pressed={failure}>{failure ? 'Restore fixture display' : 'Simulate read failure'}</button>
      </div><p role="status" aria-live="polite">{status}</p>
    </section>
    <form className={styles.panel} onSubmit={(event) => { event.preventDefault(); applyFilters(); }}><h2>Filter the dashboard</h2>
      <div className={styles.filters}><label>From (UTC)<input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} required /></label>
        <label>Through (UTC, inclusive)<input type="date" value={draft.through} onChange={(event) => setDraft({ ...draft, through: event.target.value })} required /></label>
        <label>Fictional property<select value={draft.propertyId} onChange={(event) => setDraft({ ...draft, propertyId: event.target.value })}><option value="">All fictional properties</option>{DEMO_PROPERTIES.map((property) => <option key={property.id} value={property.id}>{property.label}</option>)}</select></label>
      </div><button type="submit">Apply filters</button>{error && <p role="alert">{error}</p>}
      <p>Applied: {filter.from} through {filter.through}, UTC. Property scope and dates stay in component state.</p>
    </form>
    <section className={styles.panel} aria-labelledby="summary-title"><h2 id="summary-title">Fictional decision metrics</h2>
      {failure ? <p role="alert">Simulated analytics read failure. No stale results are displayed. Restore the fixture display to continue.</p> : <SummaryView summary={summary} />}
    </section>
    <section className={styles.panel}><h2>Study preparation</h2><p>The UAT plan contains six neutral role tasks and an unexecuted consent/observation template. Real participants, stakeholder approval, interviews and live voice/SMS checks remain pending; this simulator is not live UAT evidence.</p>
      <p>Privacy decisions: controlled event fields; no free-text notes, IPs, phone numbers, full transcripts or recordings; explicit opt-in; event-ID deduplication; 30-day maximum retention in the separate server design. The live provider source has no measurements from this demo.</p>
    </section>
  </main>
}
