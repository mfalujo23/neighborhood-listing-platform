import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import { DEMO_CLOCK, DEMO_PROPERTIES, fictionalAnalyticsEvents } from '../analytics/fixtures'
import { handleAnalyticsEvent, handleAnalyticsSummary, type AnalyticsDependencies } from '../analytics/http'
import { aggregateAnalytics } from '../analytics/metrics'
import { columnsToEvent, eventToColumns } from '../analytics/rows'
import { AnalyticsEventSchema, AnalyticsFilterSchema } from '../analytics/schema'
import { FictionalAnalyticsStore } from '../analytics/store'
import SummaryView from '../analytics/SummaryView'

const fixtures = fictionalAnalyticsEvents()
const filter = { from: '2026-11-17', through: '2026-11-18' }
const clock = () => new Date(DEMO_CLOCK)
test('equivalent duplicate events with reordered JSON keys remain idempotent', () => {
  const original = fixtures[0]
  const reordered = Object.fromEntries(Object.entries(original).reverse())
  expect(Reflect.apply(aggregateAnalytics, null, [[original, reordered], filter, 'fixture']).eventCount).toBe(1)
})
test('aggregation rejects malformed events before timestamp arithmetic', () => {
  expect(() => Reflect.apply(aggregateAnalytics, null, [[{ ...fixtures[0], occurredAt: 'invalid-date' }], filter, 'fixture'])).toThrow()
})
const makeRequest = (input: unknown, path = '/api/analytics') => new Request(`http://localhost${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
function dependencies(): AnalyticsDependencies {
  return { authorize: vi.fn().mockResolvedValue({ principal: { userId: 'fictional-user', role: 'admin' } }), enabled: () => true, clock,
    read: vi.fn().mockResolvedValue(aggregateAnalytics(fixtures, filter, 'fixture')), write: vi.fn().mockResolvedValue('accepted') }
}

describe('Minimized event boundary and in-memory opt-in', () => {
  test('all nine required event kinds validate and map without free-form storage', () => {
    expect(new Set(fixtures.map((item) => item.name)).size).toBe(9)
    for (const event of fixtures) expect(columnsToEvent(eventToColumns(AnalyticsEventSchema.parse(event)))).toEqual({ ...event, occurredAt: new Date(event.occurredAt).toISOString() })
  })
  test.each(['phone', 'ip', 'email', 'transcript', 'audio', 'userAgent'])('rejects prohibited/unknown property %s', (key) => {
    expect(AnalyticsEventSchema.safeParse({ ...fixtures[0], properties: { [key]: 'fictional extra value' } }).success).toBe(false)
  })
  test('rejects unknown event names and top-level data', () => {
    expect(AnalyticsEventSchema.safeParse({ ...fixtures[0], name: 'raw_recording' }).success).toBe(false)
    expect(AnalyticsEventSchema.safeParse({ ...fixtures[0], userId: 'extra' }).success).toBe(false)
  })
  test('default-off store collects nothing; revoking permission deletes events', () => {
    const store = new FictionalAnalyticsStore(clock)
    expect(store.ingest(fixtures[0]).status).toBe('disabled')
    store.setConsent(true)
    expect(store.ingest(fixtures[0]).status).toBe('accepted')
    store.setConsent(false)
    expect(store.events()).toEqual([])
  })
  test('duplicate ID is idempotent, changed payload conflicts and counts stay one', () => {
    const store = new FictionalAnalyticsStore(clock); store.setConsent(true)
    expect(store.ingest(fixtures[0]).status).toBe('accepted')
    expect(store.ingest(fixtures[0]).status).toBe('duplicate')
    expect(store.ingest({ ...fixtures[0], occurredAt: '2026-11-17T13:00:00Z' }).status).toBe('conflict')
    expect(store.events()).toHaveLength(1)
  })
  test('unmatched or cross-property sponsor clicks cannot inflate conversion', () => {
    const store = new FictionalAnalyticsStore(clock); store.setConsent(true)
    const click = fixtures.find((event) => event.name === 'sponsor_click')!
    expect(store.ingest(click)).toMatchObject({ status: 'invalid', code: 'UNMATCHED_IMPRESSION' })
    fixtures.filter((event) => event.name === 'sponsor_impression').forEach((event) => store.ingest(event))
    expect(store.ingest({ ...click, propertyId: DEMO_PROPERTIES[1].id })).toMatchObject({ status: 'invalid' })
  })
  test('retention purges expired events and rejects future/provider records', () => {
    let now = new Date(DEMO_CLOCK)
    const store = new FictionalAnalyticsStore(() => now); store.setConsent(true)
    store.ingest(fixtures[0])
    expect(store.ingest({ ...fixtures[0], eventId: '70000000-0000-4000-8000-000000009001', occurredAt: '2027-01-01T00:00:00Z' }).status).toBe('invalid')
    expect(store.ingest({ ...fixtures[0], source: 'provider_measured' }).status).toBe('invalid')
    now = new Date('2027-01-01T00:00:00Z')
    expect(store.events()).toEqual([])
  })
})
describe('Honest counts, denominators and UTC boundaries', () => {
  test('fictional known counts produce the expected five core rates', () => {
    const result = aggregateAnalytics(fixtures, filter, 'fixture')
    expect(result.metrics.sponsorCtr).toMatchObject({ numerator: 2, denominator: 4, percent: 50 })
    expect(result.metrics.inquiryCompletion).toMatchObject({ numerator: 2, denominator: 4, percent: 50 })
    expect(result.metrics.webhookFallback).toMatchObject({ numerator: 1, denominator: 4, percent: 25 })
    expect(result.metrics.propertyInquiry).toMatchObject({ numerator: 3, denominator: 4, percent: 75 })
    expect(result.metrics.latencySla.numerator).toBe(2)
    expect(result.metrics.latencySla.denominator).toBe(3)
    expect(result.metrics.latencySla.percent).toBeCloseTo(200 / 3)
    expect(result.neighborhoods).toEqual([{ neighborhood: '90032', impressions: 4, clickedImpressions: 2, percent: 50 }])
  })
  test('1000ms is outside the strict SLA; fixture samples are never live measurements', () => {
    expect(aggregateAnalytics(fixtures, filter).metrics.latencySla).toMatchObject({ numerator: 0, denominator: 0, percent: null })
    expect(aggregateAnalytics(fixtures, filter, 'fixture').metrics.latencySla).toMatchObject({ numerator: 2, denominator: 3 })
  })
  test('duplicate events and repeated clicks on one impression do not inflate CTR', () => {
    const click = fixtures.find((event) => event.name === 'sponsor_click')!
    const repeatedClick = { ...click, eventId: '70000000-0000-4000-8000-000000009002' }
    expect(aggregateAnalytics([...fixtures, ...fixtures, repeatedClick], filter, 'fixture').metrics.sponsorCtr).toMatchObject({ numerator: 2, denominator: 4, percent: 50 })
  })
  test('conflicting copies of one event ID fail instead of silently changing counts', () => {
    expect(() => aggregateAnalytics([...fixtures, { ...fixtures[0], occurredAt: '2026-11-17T14:00:00Z' }], filter)).toThrow('Conflicting event IDs')
  })
  test('latest completion is deterministic when callbacks arrive out of order', () => {
    const completion = fixtures.find((event) => event.name === 'call_completed')!
    const later = { ...completion, eventId: '70000000-0000-4000-8000-000000009003', occurredAt: '2026-11-18T10:00:00Z', properties: { outcome: 'unresolved' as const, pipelineLatencyMs: 1200 } }
    const first = aggregateAnalytics([...fixtures, later], filter, 'fixture')
    const reversed = aggregateAnalytics([later, ...fixtures.slice().reverse()], filter, 'fixture')
    expect(first.metrics.inquiryCompletion.numerator).toBe(1)
    expect(reversed.metrics).toEqual(first.metrics)
  })
  test('empty data and small groups show insufficient data instead of a rate', () => {
    expect(Object.values(aggregateAnalytics([], filter).metrics).every((metric) => metric.percent === null)).toBe(true)
    expect(aggregateAnalytics(fixtures, { ...filter, propertyId: DEMO_PROPERTIES[1].id }, 'fixture').metrics.sponsorCtr.percent).toBeNull()
  })
  test('offset timestamps use UTC date and the next midnight is exclusive', () => {
    const edge = { ...fixtures[0], occurredAt: '2026-11-18T00:30:00+02:00' }
    expect(aggregateAnalytics([edge], { from: '2026-11-17', through: '2026-11-17' }).eventCount).toBe(1)
    expect(aggregateAnalytics([edge], { from: '2026-11-18', through: '2026-11-18' }).eventCount).toBe(0)
    expect(aggregateAnalytics([{ ...edge, occurredAt: '2026-11-18T00:00:00Z' }], { from: '2026-11-17', through: '2026-11-17' }).eventCount).toBe(0)
  })
  test('invalid real dates and inverted windows are rejected', () => {
    expect(AnalyticsFilterSchema.safeParse({ from: '2026-02-30', through: '2026-03-01' }).success).toBe(false)
    expect(AnalyticsFilterSchema.safeParse({ from: '2026-11-18', through: '2026-11-17' }).success).toBe(false)
  })
  test('accessible table and fixture provenance accompany the chart', () => {
    const markup = renderToStaticMarkup(React.createElement(SummaryView, { summary: aggregateAnalytics(fixtures, filter, 'fixture') }))
    expect(markup).toContain('Accessible daily event counts')
    expect(markup).toContain('scope="col"')
    expect(markup).toContain('Fictional supplied latency values; no provider measured.')
  })
})
describe('Server HTTP contract (injected auth/store, no network)', () => {
  test.each([401, 403] as const)('unauthorized status %s never invokes a data reader', async (denied) => {
    const deps = dependencies(); deps.authorize = vi.fn().mockResolvedValue({ denied })
    const response = await handleAnalyticsSummary(makeRequest(filter), deps)
    expect(response.status).toBe(denied); expect(deps.read).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  test('feature flag defaults can block authorized reads and writes', async () => {
    const deps = dependencies(); deps.enabled = () => false
    expect((await handleAnalyticsSummary(makeRequest(filter), deps)).status).toBe(503)
    expect((await handleAnalyticsEvent(makeRequest({ consent: true, event: fixtures[0] }), deps)).status).toBe(503)
    expect(deps.read).not.toHaveBeenCalled(); expect(deps.write).not.toHaveBeenCalled()
  })
  test('valid date/property filters are in the body and unknown URL fields are rejected', async () => {
    const deps = dependencies()
    expect((await handleAnalyticsSummary(makeRequest(filter), deps)).status).toBe(200)
    expect((await handleAnalyticsSummary(makeRequest(filter, '/api/analytics?propertyId=extra'), deps)).status).toBe(400)
  })
  test('consent false, PII and non-fixture source are rejected before writes', async () => {
    const deps = dependencies()
    for (const input of [{ consent: false, event: fixtures[0] }, { consent: true, event: { ...fixtures[0], phone: 'fictional-extra' } }, { consent: true, event: { ...fixtures[0], source: 'provider_measured' } }]) expect((await handleAnalyticsEvent(makeRequest(input), deps)).status).toBe(400)
    expect(deps.write).not.toHaveBeenCalled()
  })
  test('server rejects bad content type, oversize input and unsupported methods', async () => {
    const deps = dependencies()
    expect((await handleAnalyticsSummary(new Request('http://localhost/api/analytics', { method: 'GET' }), deps)).status).toBe(405)
    expect((await handleAnalyticsSummary(new Request('http://localhost/api/analytics', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }), deps)).status).toBe(415)
    expect((await handleAnalyticsSummary(makeRequest({ extra: 'x'.repeat(9000) }), deps)).status).toBe(413)
  })
  test('write duplicate/conflict responses preserve event-ID semantics', async () => {
    const deps = dependencies()
    expect((await handleAnalyticsEvent(makeRequest({ consent: true, event: fixtures[0] }), deps)).status).toBe(201)
    deps.write = vi.fn().mockResolvedValue('duplicate')
    expect((await handleAnalyticsEvent(makeRequest({ consent: true, event: fixtures[0] }), deps)).status).toBe(200)
    deps.write = vi.fn().mockResolvedValue('conflict')
    expect((await handleAnalyticsEvent(makeRequest({ consent: true, event: fixtures[0] }), deps)).status).toBe(409)
  })
  test('backend failures return no raw message or partial data', async () => {
    const deps = dependencies(); deps.read = vi.fn().mockRejectedValue(new Error('private backend detail'))
    const response = await handleAnalyticsSummary(makeRequest(filter), deps)
    expect(response.status).toBe(503); expect(await response.text()).toBe('{"error":{"code":"ANALYTICS_UNAVAILABLE"}}')
  })
})
