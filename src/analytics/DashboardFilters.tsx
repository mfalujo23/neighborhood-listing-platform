'use client'

import React, { useActionState, useEffect, useRef, useState } from 'react'
import type { DashboardFilterState } from './dashboard-state'
import type { AnalyticsFilter } from './schema'
import SummaryView from './SummaryView'
import styles from './dashboard-filters.module.css'

export default function DashboardFilters({ initialState, initialFilter, filterAction }: {
  initialState: DashboardFilterState
  initialFilter: AnalyticsFilter
  filterAction: (state: DashboardFilterState, data: FormData) => Promise<DashboardFilterState>
}) {
  const [from, setFrom] = useState(initialFilter.from)
  const [through, setThrough] = useState(initialFilter.through)
  const [propertyId, setPropertyId] = useState(initialFilter.propertyId ?? '')
  const [state, formAction, pending] = useActionState(async (previous: DashboardFilterState, data: FormData) => {
    try { return await filterAction(previous, data) }
    catch { return { summary: null, filter: null, error: 'Analytics could not be loaded. Please try again. No old results are displayed.' } }
  }, initialState)
  const errorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (state.error && !pending) errorRef.current?.focus() }, [state, pending])

  return <div className={styles.dashboard}>
    <h2 id="dashboard-filters-heading">Filter dashboard</h2>
    <form action={formAction} aria-labelledby="dashboard-filters-heading" className={styles.form}>
      <div><label htmlFor="dashboard-from">From (UTC)</label><input id="dashboard-from" name="from" type="date" required value={from} onChange={event => setFrom(event.target.value)} disabled={pending} /></div>
      <div><label htmlFor="dashboard-through">Through (UTC, inclusive)</label><input id="dashboard-through" name="through" type="date" required value={through} onChange={event => setThrough(event.target.value)} disabled={pending} /></div>
      <div><label htmlFor="dashboard-property">Property ID (optional)</label><input id="dashboard-property" name="propertyId" type="text" maxLength={36} autoComplete="off" spellCheck={false} value={propertyId} onChange={event => setPropertyId(event.target.value)} disabled={pending} aria-describedby="dashboard-property-help" /><p id="dashboard-property-help">Leave blank for all properties you can access.</p></div>
      <button type="submit" disabled={pending}>{pending ? 'Loading…' : 'Apply filters'}</button>
    </form>
    <div role="status" aria-live="polite">{pending ? 'Loading dashboard results…' : state.summary ? 'Dashboard results updated.' : ''}</div>
    {!pending && state.error && <p role="alert" tabIndex={-1} ref={errorRef} className={styles.error}>{state.error}</p>}
    {!pending && state.summary && state.filter && <section aria-labelledby="dashboard-results-heading">
      <h2 id="dashboard-results-heading">Dashboard results</h2>
      <p>{state.filter.from} through {state.filter.through}, UTC. {state.filter.propertyId ? `Property: ${state.filter.propertyId}.` : 'All properties you can access.'}</p>
      <p>{state.summary.latencySource === 'fixture' ? 'Explicit fictional fixture mode.' : 'Verified provider source; missing measurements remain insufficient data.'}</p>
      <SummaryView summary={state.summary} />
    </section>}
  </div>
}
