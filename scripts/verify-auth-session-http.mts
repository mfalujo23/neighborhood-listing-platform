// Disposable fictional Auth/REST transport. No account/provider is contacted.
import assert from 'node:assert/strict'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fictionalAnalyticsEvents, DEMO_PROPERTIES } from '../src/analytics/fixtures'
import { eventToColumns } from '../src/analytics/rows'

const output = resolve('docs/mfalujo23/auth-session-evidence')
await mkdir(output, { recursive: true })
const fixturePassword = 'fictional-auth-fixture-password-only'
const publicKey = 'sb_publishable_synthetic_auth_fixture_only'
const accounts = [
  { id: '11111111-1111-4111-8111-111111111111', email: 'provider-a@example.invalid', role: 'provider', property: DEMO_PROPERTIES[0].id },
  { id: '22222222-2222-4222-8222-222222222222', email: 'provider-b@example.invalid', role: 'provider', property: DEMO_PROPERTIES[1].id },
  { id: '33333333-3333-4333-8333-333333333333', email: 'admin@example.invalid', role: 'admin', property: null },
  { id: '44444444-4444-4444-8444-444444444444', email: 'merchant@example.invalid', role: 'merchant', property: null },
  { id: '55555555-5555-4555-8555-555555555555', email: 'client@example.invalid', role: 'client', property: null },
  // Existing compatibility role only; no new role is granted in production.
  { id: '66666666-6666-4666-8666-666666666666', email: 'legacy@example.invalid', role: 'property_professional', property: DEMO_PROPERTIES[0].id },
]
type Account = typeof accounts[number]
type Token = { account: Account; expires: number; refresh: string }
const access = new Map<string, Token>(), refresh = new Map<string, Account>()
const revoked = new Set<string>()
let shortLived = false, outage = false, refreshCount = 0, passwordCount = 0, rpcCount = 0
const issuedMaterial = new Set<string>([fixturePassword])
function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(body))
}
async function body(request: IncomingMessage) {
  const chunks: Buffer[] = []; let length = 0
  for await (const value of request) { const chunk = Buffer.from(value); length += chunk.length; if (length > 8192) throw new Error('Fixture body too large'); chunks.push(chunk) }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}
function issue(account: Account) {
  const seconds = shortLived ? 2 : 3600, expires = Math.floor(Date.now() / 1000) + seconds
  // Syntactic mock JWT only: identity is checked by the exact fixture token map,
  // not custom cryptography. Production authentication uses the official SDK.
  const token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: account.id, aud: 'authenticated', role: 'authenticated', exp: expires, iat: Math.floor(Date.now() / 1000), jti: randomUUID() })).toString('base64url'), 'synthetic-fixture-signature-only'].join('.')
  const handle = 'synthetic-refresh-'+randomUUID()
  access.set(token, { account, expires, refresh: handle }); refresh.set(handle, account)
  issuedMaterial.add(token); issuedMaterial.add(handle)
  return { access_token: token, refresh_token: handle, token_type: 'bearer', expires_in: seconds, expires_at: expires,
    user: { id: account.id, email: account.email, aud: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { role: 'admin' }, created_at: '2026-11-19T00:00:00Z' } }
}
function verified(request: IncomingMessage) {
  const token = request.headers.authorization?.replace(/^Bearer /, '') ?? ''
  const session = access.get(token)
  return session && session.expires > Date.now() / 1000 && !revoked.has(session.account.id) ? { token, ...session } : null
}
const fixture = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    if (request.headers.apikey !== publicKey) return json(response, 401, { message: 'Fictional fixture key required.' })
    if (outage) return json(response, 503, { message: 'Fictional Auth outage.' })
    if (url.pathname === '/auth/v1/token' && request.method === 'POST') {
      const input = await body(request)
      if (url.searchParams.get('grant_type') === 'password') {
        passwordCount++
        const account = accounts.find(account => account.email === input.email)
        if (!account || input.password !== fixturePassword || revoked.has(account.id)) return json(response, 400, { code: 'invalid_credentials', msg: 'Invalid fictional credentials.' })
        return json(response, 200, issue(account))
      }
      if (url.searchParams.get('grant_type') === 'refresh_token') {
        const account = typeof input.refresh_token === 'string' ? refresh.get(input.refresh_token) : null
        if (!account || revoked.has(account.id)) return json(response, 400, { code: 'refresh_token_not_found', msg: 'Fictional refresh unavailable.' })
        refreshCount++; refresh.delete(String(input.refresh_token))
        return json(response, 200, issue(account))
      }
    }
    const session = verified(request)
    if (!session) return json(response, 401, { code: 'bad_jwt', msg: 'Unknown or expired fictional session.' })
    if (url.pathname === '/auth/v1/user') return json(response, 200, { id: session.account.id, email: session.account.email, aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { role: 'admin' }, created_at: '2026-11-19T00:00:00Z' })
    if (url.pathname === '/auth/v1/logout') {
      access.delete(session.token); refresh.delete(session.refresh)
      response.writeHead(204); response.end(); return
    }
    if (url.pathname === '/rest/v1/profiles') {
      if (url.searchParams.get('id') !== 'eq.'+session.account.id) return json(response, 200, null)
      return json(response, 200, { role: session.account.role })
    }
    if (url.pathname === '/rest/v1/rpc/analytics_event_window') {
      rpcCount++
      const events = fictionalAnalyticsEvents().filter(event => session.account.role === 'admin' || event.propertyId === session.account.property)
      const impressions = events.filter(event => event.name === 'sponsor_impression')
      const clicked = new Set(events.flatMap(event => event.name === 'sponsor_click' ? [event.properties.impressionId] : []))
      return json(response, 200, { truncated: false, events: events.map(eventToColumns), sponsorCtr: impressions.length ? [{ neighborhood: '90032', impression_count: impressions.length, clicked_impressions: clicked.size, ctr_percent: clicked.size / impressions.length * 100 }] : [] })
    }
    return json(response, 404, { message: 'Unknown fictional route.' })
  } catch { return json(response, 500, { message: 'Fictional transport failure.' }) }
})
await new Promise<void>(resolve => fixture.listen(0, '127.0.0.1', resolve))
const address = fixture.address(); assert.ok(address && typeof address === 'object')
const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve))
const appAddress = probe.address(); assert.ok(appAddress && typeof appAddress === 'object')
const appPort = appAddress.port; await new Promise<void>(resolve => probe.close(() => resolve()))
const origin = `http://127.0.0.1:${appPort}`
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(SUPABASE|NEXT_PUBLIC_SUPABASE|TWILIO|VAPI|GEMINI|GOOGLE|DATABASE|SMTP|ENABLE_ANALYTICS|ANALYTICS_FIXTURE_MODE)/.test(name)))
Object.assign(env, { SUPABASE_URL: `http://127.0.0.1:${address.port}`, SUPABASE_PUBLISHABLE_KEY: publicKey, MIDTERM_LOCAL_FIXTURE_PREVIEW: 'true', ENABLE_ANALYTICS: 'true', ANALYTICS_FIXTURE_MODE: 'true', NEXT_TELEMETRY_DISABLED: '1', ENABLE_OUTBOUND_SMS: 'false' })
let processLog = ''
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(appPort)], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] })
app.stdout.on('data', value => { processLog += String(value) }); app.stderr.on('data', value => { processLog += String(value) })
type Jar = Map<string, string>
const results: Array<Record<string, unknown>> = []
function applyCookies(response: Response, jar: Jar) {
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';', 1)[0], cut = pair.indexOf('='), name = pair.slice(0, cut), content = pair.slice(cut+1)
    if (/max-age=0|expires=thu, 01 jan 1970/i.test(value)) jar.delete(name)
    else jar.set(name, content)
  }
}
async function call(name: string, path: string, { jar = new Map(), body: payload, originHeader = origin, method = 'GET', raw, type = 'application/json' }: { jar?: Jar; body?: unknown; originHeader?: string | null; method?: string; raw?: string; type?: string } = {}) {
  const headers = new Headers()
  if (jar.size) headers.set('Cookie', [...jar].map(([name,value]) => name+'='+value).join('; '))
  if (method === 'POST') { if (originHeader !== null) headers.set('Origin', originHeader); if (payload !== undefined || raw !== undefined) headers.set('Content-Type', type) }
  const response = await fetch(origin+path, { method, headers, body: raw ?? (payload === undefined ? undefined : JSON.stringify(payload)), redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const text = await response.text()
  for (const material of issuedMaterial) assert.ok(!text.includes(material), 'Credential material appeared in response body')
  for (const [name, value] of response.headers) if (name.toLowerCase() !== 'set-cookie') {
    for (const material of issuedMaterial) assert.ok(!value.includes(material), 'Credential material appeared outside Set-Cookie')
  }
  const cookies = response.headers.getSetCookie()
  applyCookies(response, jar)
  results.push({ name, path, status: response.status, cacheControl: response.headers.get('cache-control'), setCookieCount: cookies.length, cookieHttpOnly: cookies.length ? cookies.every(cookie => /httponly/i.test(cookie)) : null, credentialMaterialInBody: false, credentialMaterialOutsideSetCookie: false })
  return { response, text, cookies }
}
async function login(account: Account, jar: Jar) {
  const result = await call('sign in '+account.role, '/api/auth/sign-in', { jar, method: 'POST', body: { email: account.email, password: fixturePassword } })
  assert.equal(result.response.status, 200); assert.ok(jar.size); assert.ok(result.cookies.every(value => /httponly/i.test(value)))
}
try {
  const deadline = Date.now()+25000
  for (;;) {
    try { const response = await fetch(origin+'/login'); if (response.status === 200) break } catch {}
    if (Date.now()>deadline) throw new Error('Local application startup failed')
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  const signedOut = await call('ordinary signed-out dashboard', '/realtor-dashboard')
  assert.ok(signedOut.text.includes('Dashboard access required')); assert.ok(!signedOut.text.includes('Protected realtor dashboard'))
  assert.equal((await call('cross-origin sign in denied', '/api/auth/sign-in', { method: 'POST', originHeader: 'https://other.example.invalid', body: {} })).response.status, 403)
  assert.equal((await call('missing Origin denied', '/api/auth/sign-in', { method: 'POST', originHeader: null, body: {} })).response.status, 403)
  assert.equal((await call('unknown key denied', '/api/auth/sign-in', { method: 'POST', body: { email: accounts[0].email, password: fixturePassword, role: 'admin' } })).response.status, 400)
  assert.equal((await call('oversize denied', '/api/auth/sign-in', { method: 'POST', raw: 'x'.repeat(4097) })).response.status, 413)
  assert.equal((await call('malformed JSON denied', '/api/auth/sign-in', { method: 'POST', raw: '{' })).response.status, 400)
  assert.equal((await call('unsupported type denied', '/api/auth/sign-in', { method: 'POST', raw: '{}', type: 'text/plain' })).response.status, 415)
  assert.equal((await call('incorrect password denied', '/api/auth/sign-in', { method: 'POST', body: { email: accounts[0].email, password: 'incorrect-fictional-only' } })).response.status, 401)
  const provider = new Map<string,string>(); await login(accounts[0], provider)
  let page = await call('ordinary provider cookie dashboard', '/realtor-dashboard', { jar: provider })
  assert.ok(page.text.includes('Protected realtor dashboard')); assert.ok(page.text.includes('66.7%'))
  const beforeCookieApi = rpcCount
  assert.equal((await call('cookie cannot broaden bearer API', '/api/analytics', { jar: provider, method: 'POST', body: { from: '2026-11-13', through: '2026-11-19' } })).response.status, 401)
  assert.equal(rpcCount, beforeCookieApi)
  for (const account of accounts.slice(1)) {
    const jar = new Map<string,string>(); await login(account, jar)
    page = await call('dashboard role '+account.role, '/realtor-dashboard', { jar })
    assert.equal(page.text.includes('Protected realtor dashboard'), ['provider','admin','property_professional'].includes(account.role))
    if (account.role === 'admin') assert.ok(page.text.includes('50.0%'))
    if (account.id === accounts[1].id) assert.ok(page.text.includes('Insufficient data'))
  }
  shortLived = true
  const expiring = new Map<string,string>(); await login(accounts[0], expiring)
  const beforeRefresh = refreshCount; shortLived = false
  await new Promise(resolve => setTimeout(resolve, 2200))
  page = await call('expired session refreshed by official SDK and Proxy', '/realtor-dashboard', { jar: expiring })
  assert.ok(page.text.includes('Protected realtor dashboard')); assert.ok(refreshCount > beforeRefresh); assert.ok(page.cookies.length)
  const beforeRevoked = rpcCount; revoked.add(accounts[0].id)
  page = await call('revoked session fails before metrics', '/realtor-dashboard', { jar: expiring })
  assert.ok(!page.text.includes('Protected realtor dashboard')); assert.equal(rpcCount, beforeRevoked)
  revoked.clear()
  assert.equal((await call('cross-origin logout denied', '/api/auth/sign-out', { jar: provider, method: 'POST', originHeader: 'https://other.example.invalid' })).response.status, 403)
  assert.equal((await call('same-origin logout clears cookie', '/api/auth/sign-out', { jar: provider, method: 'POST' })).response.status, 200)
  assert.equal(provider.size, 0)
  page = await call('signed-out dashboard has no metrics', '/realtor-dashboard', { jar: provider }); assert.ok(!page.text.includes('Protected realtor dashboard'))
  outage = true
  assert.equal((await call('Auth outage is coarse503', '/api/auth/sign-in', { method: 'POST', body: { email: accounts[0].email, password: fixturePassword } })).response.status, 503)
  outage = false
  for (const value of issuedMaterial) assert.ok(!processLog.includes(value), 'Credential material appeared in process log')
  await writeFile(resolve(output,'local-http-results.json'), JSON.stringify({ localOnly: true, fictionalTransport: true, officialSdk: true, actualProductionNextHttp: true, hostedAuthVerified: false, providerRequests: 0, realAccountsOrContacts: false, checks: results, refreshesObserved: refreshCount, passwordRequestsObserved: passwordCount, protectedRpcRequestsObserved: rpcCount, credentialsInBodiesOrProcessLogs: false },null,2)+'\n')
  console.log(`AUTH SESSION HTTP: ${results.length} actual local HTTP checks PASS; official SDK cookies/refresh/revoke, role scope and CSRF; no provider requests.`)
} finally {
  if (app.exitCode === null && app.signalCode === null) {
    const ended = new Promise(resolve => app.once('exit', resolve))
    app.kill(); await ended
  }
  await new Promise<void>(resolve => fixture.close(() => resolve()))
  await writeFile(resolve(output,'local-http-process.log'), processLog.replaceAll(process.cwd(),'<workspace>'))
}
