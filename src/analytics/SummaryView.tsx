import React from 'react'
import type { AnalyticsSummary } from './metrics'

const names: Record<keyof AnalyticsSummary['metrics'], string> = {
  sponsorCtr: 'Sponsor click-through rate', inquiryCompletion: 'Successful inquiry completion',
  webhookFallback: 'Webhook timeout / fallback rate', propertyInquiry: 'Property inquiry conversion',
  latencySla: 'Latency samples below 1000ms', callCompletion: 'Call completion', toolSuccess: 'Tool success', escalation: 'Escalation',
}
export default function SummaryView({ summary }: { summary: AnalyticsSummary }) {
  const maximum = Math.max(1, ...summary.daily.map((day) => day.count))
  return <div>
    <p><strong>{summary.eventCount}</strong> unique events in the selected UTC window. Rates require at least three denominator observations.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '1rem', margin: '1rem 0' }}>
      {(Object.entries(summary.metrics) as [keyof typeof names, AnalyticsSummary['metrics']['sponsorCtr']][]).map(([name, metric]) => <article key={name} style={{ border: '1px solid #a7b6ae', borderRadius: '10px', padding: '1rem' }}>
        <h3>{names[name]}</h3>
        <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>{metric.percent === null ? 'Insufficient data' : `${metric.percent.toFixed(1)}%`}</p>
        <p>{metric.numerator} / {metric.denominator}</p>
        <p>{metric.definition}</p>
        {name === 'latencySla' && <p><strong>{summary.latencySource === 'fixture' ? 'Fictional supplied latency values; no provider measured.' : 'Provider-measured source only; local proxy times excluded.'}</strong></p>}
      </article>)}
    </div>
    <section aria-labelledby="daily-chart-title"><h2 id="daily-chart-title">Daily event volume (UTC)</h2>
      <p>Decision: compare coarse activity across days before investigating a change. Counts describe the selected source, not unique people.</p>
      {summary.daily.length ? <div role="img" aria-label={summary.daily.map((day) => `${day.day}: ${day.count} events`).join('; ')}>
        {summary.daily.map((day) => <div key={day.day} style={{ display: 'grid', gridTemplateColumns: '7rem 1fr 3rem', gap: '.5rem', margin: '.75rem 0' }}>
          <span>{day.day}</span><span aria-hidden="true" style={{ display: 'block', background: '#176147', width: `${day.count / maximum * 100}%`, minHeight: '1.4rem', borderRadius: '4px' }} /><span>{day.count}</span>
        </div>)}
      </div> : <p>No events in this window.</p>}
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}><caption>Accessible daily event counts — same values as the chart</caption><thead><tr><th scope="col">UTC day</th><th scope="col">Unique event count</th></tr></thead><tbody>
        {summary.daily.map((day) => <tr key={day.day}><th scope="row">{day.day}</th><td>{day.count}</td></tr>)}
        {!summary.daily.length && <tr><td colSpan={2}>Insufficient data</td></tr>}
      </tbody></table>
    </section>
    <section><h2>Sponsor CTR by neighborhood</h2><table style={{ width: '100%', textAlign: 'left' }}><caption>Matched distinct impression opportunities by coarse ZIP</caption><thead><tr><th scope="col">Neighborhood ZIP</th><th scope="col">Clicked / impressions</th><th scope="col">CTR</th></tr></thead><tbody>
      {summary.neighborhoods.map((item) => <tr key={item.neighborhood}><th scope="row">{item.neighborhood}</th><td>{item.clickedImpressions} / {item.impressions}</td><td>{item.percent === null ? 'Insufficient data' : `${item.percent.toFixed(1)}%`}</td></tr>)}
      {!summary.neighborhoods.length && <tr><td colSpan={3}>Insufficient data</td></tr>}
    </tbody></table></section>
    <section><h2>Inquiry categories</h2><p>Derived categories only; no quotes, full transcripts or participant identity.</p>
      <table style={{ width: '100%', textAlign: 'left' }}><caption>Intent-category event counts</caption><thead><tr><th scope="col">Category</th><th scope="col">Events</th></tr></thead><tbody>
        {summary.categories.map((item) => <tr key={item.category}><th scope="row">{item.category.replaceAll('_', ' ')}</th><td>{item.count}</td></tr>)}
        {!summary.categories.length && <tr><td colSpan={2}>Insufficient data</td></tr>}
      </tbody></table>
    </section>
  </div>
}
