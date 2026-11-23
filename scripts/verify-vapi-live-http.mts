import { PGlite } from '@electric-sql/pglite'
import assert from 'node:assert/strict'
import http from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { createVoiceDatabase, PROPERTY_PROJECTION } from '../src/voice/live/database.ts'
import { createVapiToolHandler, executeLiveTool } from '../src/voice/live/handler.ts'

const propertyId = '60000000-0000-4000-8000-000000000001'
const privateId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001'
const assistantId = '70000000-0000-4000-8000-000000000001'
const callId = '80000000-0000-4000-8000-000000000001'
const token = 'synthetic-vapi-http-token-no-real-credentials'
const publicKey = 'sb_publishable_synthetic_local_fixture_only'
const db = await PGlite.create()
const checks: unknown[] = []
const wire: unknown[] = []
let dbRequests = 0
let abortedSponsorConnections = 0
let fault: 'none' | 'sponsor-delay' | 'rpc-unavailable' = 'none'
let transactionTail: Promise<unknown> = Promise.resolve()
const anon = (sql: string, args: unknown[] = []) => {
  const next = transactionTail.then(async () => {
    await db.exec('begin; set local role anon;')
    try { return await db.query(sql, args) }
    finally { await db.exec('rollback;') }
  })
  transactionTail = next.catch(() => {})
  return next
}
function listen(server: http.Server): Promise<number> {
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port)))
}
async function stop(server: http.Server) {
  server.closeAllConnections()
  await new Promise<void>(resolve => server.close(() => resolve()))
}
async function body(req: http.IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}
const envelope = (name = 'get_property_details', args: unknown = { property_id: propertyId }) => ({
  message: { type: 'tool-calls', call: { id: callId, assistantId },
    toolCallList: [{ id: 'synthetic-http-tool', type: 'function', function: { name, arguments: args } }] },
})
let databaseServer: http.Server | undefined
let callbackServer: http.Server | undefined
try {
  await db.exec(await readFile('supabase/local/auth-bootstrap.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20261118000400_restore_backend_contracts_rls.sql', 'utf8'))
  await db.exec(await readFile('supabase/local/backend-fixtures.sql', 'utf8'))
  await db.exec("create table public.sponsors(id uuid primary key, owner_id uuid references auth.users(id), name text, active boolean not null default false, approved boolean not null default false); create table public.property_sponsors(property_id uuid references public.properties(id),sponsor_id uuid references public.sponsors(id),primary key(property_id,sponsor_id));")
  await db.exec(await readFile('supabase/migrations/20261118000500_eligible_sponsors.sql', 'utf8'))
  await db.query("insert into public.properties(id,owner_id,title,description,approved,street,city,state,zip_code,price,bedrooms,bathrooms,square_feet,amenities) values($1,'11111111-1111-4111-8111-111111111111','Fictional live-tool property','Fictional local database only.',true,'50 Example Way','Demo City','CA','90032',500000,2,1,900,array['Sample courtyard'])", [propertyId])
  const sponsorFixture = await readFile('supabase/local/lab6-sponsor-audit-fixture.sql', 'utf8')
  await db.exec(sponsorFixture.split('set local role anon;')[0] + 'commit;')
  const privateRows = (await anon('select id from public.properties where id=$1', [privateId])).rows
  assert.deepEqual(privateRows, [])
  checks.push({ name: 'actual local anon RLS hides unapproved property without an approved query filter', passed: true, rows: privateRows })
  const eligible = (await anon('select * from public.eligible_sponsors_for_property($1,$2,$3)', [propertyId, '90032', 'sidebar'])).rows
  assert.deepEqual(eligible.map((r: Record<string, unknown>) => r.business_name), ['Sponsor C', 'Sponsor B', 'Sponsor A'])
  checks.push({ name: 'actual local anon RPC excludes pending sponsor and preserves rank', passed: true, names: eligible.map((r: Record<string, unknown>) => r.business_name) })

  databaseServer = http.createServer(async (req, res) => {
    dbRequests++
    try {
      if (req.headers.apikey !== publicKey || req.headers.authorization) { res.writeHead(403).end(); return }
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      let rows: unknown
      if (req.method === 'GET' && url.pathname === '/rest/v1/properties') {
        assert.equal(url.searchParams.get('select'), PROPERTY_PROJECTION)
        assert.equal(url.searchParams.get('approved'), 'eq.true')
        assert.equal(url.searchParams.get('limit'), '1')
        const id = url.searchParams.get('id')?.replace(/^eq\./, '')
        rows = (await anon('select ' + PROPERTY_PROJECTION + ' from public.properties where id=$1 and approved=true limit 1', [id])).rows
      } else if (req.method === 'POST' && url.pathname === '/rest/v1/rpc/eligible_sponsors_for_property') {
        const args = JSON.parse((await body(req)).toString('utf8'))
        if (fault === 'sponsor-delay') {
          res.on('close', () => { if (!res.writableEnded) abortedSponsorConnections++ })
          await new Promise(resolve => setTimeout(resolve, 3200))
          if (res.destroyed) return
        }
        if (fault === 'rpc-unavailable') { res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"code":"PGRST202","message":"synthetic missing RPC"}'); return }
        assert.deepEqual(Object.keys(args).sort(), ['p_placement', 'p_property_id', 'p_zip'])
        // PGlite decodes SQL DATE to Date; PostgREST serializes DATE as
        // YYYY-MM-DD. Adapt only that wire representation, not SQL results.
        rows = (await anon('select * from public.eligible_sponsors_for_property($1,$2,$3)', [args.p_property_id, args.p_zip, args.p_placement])).rows.map(row => ({
          ...row,
          start_date: row.start_date instanceof Date ? row.start_date.toISOString().slice(0, 10) : row.start_date,
          end_date: row.end_date instanceof Date ? row.end_date.toISOString().slice(0, 10) : row.end_date,
        }))
      } else { res.writeHead(404).end(); return }
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(rows))
    } catch {
      if (!res.destroyed) res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":"local fixture transport unavailable"}')
    }
  })
  const databasePort = await listen(databaseServer)
  const adapter = createVoiceDatabase({ url: 'http://127.0.0.1:' + databasePort, publishableKey: publicKey })
  const handle = createVapiToolHandler({ token, assistantId, database: adapter })
  callbackServer = http.createServer(async (req, res) => {
    try {
      const input = await body(req)
      let output: Response
      if (req.url === '/internal/sponsors') {
        const result = await executeLiveTool('get_nearby_sponsors', JSON.parse(input.toString('utf8')), adapter)
        output = Response.json(result, { status: result.status })
      } else {
        const headers = new Headers()
        for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value)
        output = await handle(new Request('http://127.0.0.1' + req.url, {
          method: req.method, headers, ...(['GET', 'HEAD'].includes(req.method ?? '') ? {} : { body: input }),
        }))
      }
      res.writeHead(output.status, Object.fromEntries(output.headers))
      res.end(Buffer.from(await output.arrayBuffer()))
    } catch { res.writeHead(500).end('Local harness failure') }
  })
  const callbackPort = await listen(callbackServer)
  async function call(name: string, payload: unknown, expected: number, options: { path?: string; auth?: boolean; method?: string; contentType?: string; raw?: string } = {}) {
    const started = performance.now()
    const response = await fetch('http://127.0.0.1:' + callbackPort + (options.path ?? '/api/voice/tools'), {
      method: options.method ?? 'POST',
      headers: { ...(options.auth === false ? {} : { Authorization: 'Bearer ' + token }), 'Content-Type': options.contentType ?? 'application/json' },
      ...((options.method ?? 'POST') === 'GET' ? {} : { body: options.raw ?? JSON.stringify(payload) }),
    })
    const raw = await response.text()
    const observation = { name, status: response.status, elapsedMs: Math.round(performance.now() - started), headers: Object.fromEntries([...response.headers].filter(([key]) => ['content-type', 'cache-control', 'allow'].includes(key))), body: raw }
    wire.push(observation)
    assert.equal(response.status, expected, name)
    checks.push({ name, passed: true })
    return { observation, json: () => JSON.parse(raw) }
  }
  const good = await call('real HTTP callback reads actual anon approved local PostgreSQL row', envelope(), 200)
  assert.equal(JSON.parse(good.json().results[0].result).property.id, propertyId)
  assert.ok(!good.observation.body.includes('owner_id'))
  const hidden = await call('real HTTP callback cannot read unapproved row under anon RLS', envelope('get_property_details', { property_id: privateId }), 200)
  assert.match(hidden.json().results[0].error, /NOT_FOUND/)
  const sponsors = await call('real HTTP callback reads actual eligible sponsor RPC', envelope('get_nearby_sponsors', { property_id: propertyId, zip: '90032' }), 200)
  assert.deepEqual(JSON.parse(sponsors.json().results[0].result).sponsors.map((r: { name: string }) => r.name), ['Sponsor C', 'Sponsor B', 'Sponsor A'])
  const before = dbRequests
  await call('unauthenticated real HTTP callback denied before database', envelope(), 401, { auth: false })
  assert.equal(dbRequests, before)
  const bad = await call('invalid ten-digit ZIP returns correlated error without database', envelope('get_nearby_sponsors', { property_id: propertyId, zip: '9003290032' }), 200)
  assert.match(bad.json().results[0].error, /INVALID_ARGUMENTS/)
  assert.equal(dbRequests, before)
  const follow = await call('followup explicitly unavailable with no database or dispatch', envelope('request_agent_followup', { property_id: propertyId, consent: true, preferred_channel: 'phone' }), 200)
  assert.match(follow.json().results[0].error, /No request was submitted/)
  assert.equal(dbRequests, before)
  await call('method restriction over HTTP', null, 405, { method: 'GET' })
  await call('non-JSON restriction over HTTP', {}, 415, { contentType: 'text/plain' })
  await call('malformed JSON restriction over HTTP', null, 400, { raw: '{' })
  await call('bounded body restriction over HTTP', null, 413, { raw: 'x'.repeat(16385) })
  fault = 'rpc-unavailable'
  const unavailable = await call('missing real RPC cannot fabricate sponsor data', envelope('get_nearby_sponsors', { property_id: propertyId, zip: '90032' }), 200)
  assert.match(unavailable.json().results[0].error, /UNAVAILABLE/)
  fault = 'sponsor-delay'
  const internal = await call('actual2500ms abort produces internal HTTP504 at harness adapter boundary', { property_id: propertyId, zip: '90032' }, 504, { path: '/internal/sponsors' })
  assert.match(internal.observation.body, /TIMEOUT/)
  assert.ok(internal.observation.elapsedMs >= 2400 && internal.observation.elapsedMs < 4000)
  const outer = await call('actual2500ms sponsor abort is translated to HTTP200 Vapi error', envelope('get_nearby_sponsors', { property_id: propertyId, zip: '90032' }), 200)
  assert.match(outer.json().results[0].error, /TIMEOUT/)
  assert.ok(!('result' in outer.json().results[0]))
  assert.ok(outer.observation.elapsedMs >= 2400 && outer.observation.elapsedMs < 4000)
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.ok(abortedSponsorConnections >= 2, 'Both delayed HTTP transports must actually close after abort')
  checks.push({ name: 'both delayed RPC HTTP connections actually aborted', passed: true, observed: abortedSponsorConnections })
  fault = 'none'
  const recovered = await call('normal real HTTP read recovers after controlled fault', envelope('get_nearby_sponsors', { property_id: propertyId, zip: '90032' }), 200)
  assert.equal(JSON.parse(recovered.json().results[0].result).sponsors.length, 3)
  const output = {
    scope: 'Actual loopback HTTP and disposable PGlite PostgreSQL anon RLS/RPC verification. Local HTTP bridge emulates only the fixed PostgREST read/RPC wire contract; this is not hosted Supabase, actual PostgREST, Vapi, Twilio, a call, or delivery evidence.',
    at: new Date().toISOString(), runtime: process.version, passed: checks.length, failed: 0,
    localAuthStubsOnly: true, noHostedOrProviderCalls: true, noPrivateCredentials: true,
    queryTimeoutMs: 2500, dbRequests, abortedSponsorConnections, checks, wire,
  }
  await mkdir('docs/mfalujo23/vapi-live-evidence', { recursive: true })
  await writeFile('docs/mfalujo23/vapi-live-evidence/local-http-results.json', JSON.stringify(output, null, 2) + '\n')
  console.log(JSON.stringify({ scope: output.scope, passed: output.passed, failed: 0, queryTimeoutMs: 2500, abortedSponsorConnections }))
} finally {
  if (callbackServer) await stop(callbackServer)
  if (databaseServer) await stop(databaseServer)
  await transactionTail
  await db.close()
}

