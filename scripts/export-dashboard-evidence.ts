import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { DEMO_CLOCK, fictionalAnalyticsEvents } from '../src/analytics/fixtures'
import { aggregateAnalytics } from '../src/analytics/metrics'
import { eventToColumns } from '../src/analytics/rows'
import { AnalyticsEventSchema } from '../src/analytics/schema'
import { FictionalAnalyticsStore } from '../src/analytics/store'
import { handleAnalyticsEvent, type AnalyticsDependencies } from '../src/analytics/http'

async function main() {
  const directory = path.resolve('docs/mfalujo23/evidence')
  fs.mkdirSync(directory, { recursive: true }); fs.mkdirSync('supabase/local', { recursive: true })
  const fixture = fictionalAnalyticsEvents().map((event) => AnalyticsEventSchema.parse(event))
  const columns = fixture.map((event) => { const row = eventToColumns(event); return { ...row, payload_hash: createHash('sha256').update(JSON.stringify(row)).digest('hex') } })
  fs.writeFileSync('supabase/local/analytics-event-fixtures.json', JSON.stringify({ fictional: true, clock: DEMO_CLOCK, rows: columns }, null, 2) + '\n')
  fs.writeFileSync(path.join(directory, 'analytics-events.schema.json'), JSON.stringify(z.toJSONSchema(AnalyticsEventSchema), null, 2) + '\n')
  const clock = () => new Date(DEMO_CLOCK)
  const store = new FictionalAnalyticsStore(clock)
  const defaultOff = store.ingest(fixture[0])
  store.setConsent(true)
  const ingestion = fixture.map((event) => store.ingest(event))
  const duplicate = store.ingest(fixture[0])
  const conflict = store.ingest({ ...fixture[0], occurredAt: '2026-11-17T13:00:00Z' })
  const filter = { from: '2026-11-17', through: '2026-11-18' }
  const summary = aggregateAnalytics(store.events(), filter, 'fixture')
  const providerOnly = aggregateAnalytics(store.events(), filter)
  const deps: AnalyticsDependencies = { authorize: async () => ({ principal: { userId: 'unit-test-only', role: 'admin' } }), enabled: () => true, clock, read: async () => summary, write: async () => 'accepted' }
  const invalidResponse = await handleAnalyticsEvent(new Request('http://localhost/api/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consent: true, event: { ...fixture[0], phone: 'forbidden synthetic extra field' } }) }), deps)
  store.setConsent(false)
  const evidence = {
    generatedAt: new Date().toISOString(), mode: 'Fictional deterministic local execution; no real participant, provider measurement, database or HTTP network called by this export script.',
    fixtureEventCount: fixture.length, defaultOff, accepted: ingestion.filter((result) => result.status === 'accepted').length,
    duplicate, conflict, fixtureSummary: summary, providerOnlyLatencyMetric: providerOnly.metrics.latencySla,
    invalidClientResponse: { status: invalidResponse.status, headers: Object.fromEntries(invalidResponse.headers), body: await invalidResponse.text() },
    eventsAfterRevocation: store.events().length, actualParticipantSessions: 0, actualProviderSamples: 0,
  }
  fs.writeFileSync(path.join(directory, 'dashboard-actual-results.json'), JSON.stringify(evidence, null, 2) + '\n')
  const read = (file: string) => fs.readFileSync(file, 'utf8').trim()
  const migration = read('supabase/migrations/20261118000600_minimized_analytics.sql')
  const functionText = (name: string) => migration.slice(migration.indexOf(`create or replace function public.${name}`), migration.indexOf(`revoke all on function public.${name}`)).trim()
  const dictionary = read('docs/mfalujo23/lab14-data-dictionary.md')
  const table = dictionary.slice(dictionary.indexOf('## Five core metrics'), dictionary.indexOf('## Actual local fixture output')).trim()
  const server = read('src/analytics/server.ts')
  const rpc = server.slice(server.indexOf("const { data, error } = await verified.client.rpc('analytics_event_window'"), server.indexOf("if (error) throw new Error('Analytics unavailable.')")).trim()
  fs.writeFileSync('docs/mfalujo23/lab14-audit.md', [
    '# Audit 14: telemetry pipeline and decision-support metrics — mfalujo23', '',
    'This answer is grounded in the implemented `public.analytics_events` model, strict event contract, protected API and actual fictional local PostgreSQL execution. It does not claim deployed analytics, real UAT, real calls or provider performance. The live source has no supplied samples.', '',
    table, '', '## Executable protected query path', '',
    'The exact `/api/analytics` POST route delegates to the authenticated handler. Filters are strict JSON in the body; no caller-selected role is accepted. Responses contain aggregates only.', '',
    '```ts', read('src/app/api/analytics/route.ts'), '```', '',
    'Exact server call after bearer-token/profile authorization; the caller uses its user-scoped client so PostgreSQL RLS remains active:', '', '```ts', rpc, '```', '',
    'The bounded event-window RPC uses the same SQL statement snapshot for the event window and CTR. Actual function:', '', '```sql', functionText('analytics_event_window'), '```', '',
    'Metric 1 is computed by this exact SQL function. COUNT(DISTINCT i.event_id) deduplicates opportunities; the numerator counts each matched impression at most once. The join checks event kind/property/correlation/source and bounds click timestamps; WHERE checks impression kind/source/property and bounds impression timestamps. RLS limits rows to the verified role/property scope.', '',
    '```sql', functionText('analytics_sponsor_ctr'), '```', '',
    '## Actual local evidence', '',
    'The fixture has 30 fictional events. Local JavaScript and actual disposable PostgreSQL both produced CTR 2/4=50% for ZIP90032. The unit suite checks duplicate/conflicting IDs, real calendar/UTC boundaries, missing/small samples, strict shapes, role verification, default-off consent, revocation and safe errors. PostgreSQL checks table/RPC permissions, owner scoping, exact distinct CTR, duplicate-key rejection, event shape, retention and forward-migration reapplication. Its auth profiles are local stubs, not actual Supabase sessions.', '',
    'Actual fixture summary:', '', '```json', JSON.stringify(summary, null, 2), '```', '',
    'Provider-only latency result (fixture times excluded):', '', '```json', JSON.stringify(evidence.providerOnlyLatencyMetric, null, 2), '```', '',
    'Raw evidence: `evidence/dashboard-actual-results.json`, `evidence/analytics-local-postgres.json`, `evidence/dashboard-tests.txt` and `evidence/analytics-postgres-terminal.txt`. The complete model is `supabase/migrations/20261118000600_minimized_analytics.sql`; strict JSON Schema is in `evidence/analytics-events.schema.json`.', '',
    'Protected live deployment/authenticated session integration, actual provider measurements, retention scheduling, required ChatGPT/Gemini recommendation comparison and empirical UAT remain pending. None is inferred from the fictional fixture or automated browser checks.', '',
  ].join('\n'))
  console.log(JSON.stringify({ events: fixture.length, accepted: evidence.accepted, duplicate: duplicate.status, coreFixtureRates: Object.fromEntries(Object.entries(summary.metrics).map(([name, rate]) => [name, [rate.numerator, rate.denominator, rate.percent]])), providerSla: providerOnly.metrics.latencySla, eventsAfterRevocation: evidence.eventsAfterRevocation }))
}
void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
