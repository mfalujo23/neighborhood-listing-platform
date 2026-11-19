// Production Next HTTP against disposable fictional PostgreSQL and synthetic
// local session responses. This does not verify hosted Supabase Auth/PostgREST.
import { spawn } from 'node:child_process'
import { setTimeout as pause } from 'node:timers/promises'
import { mkdir, writeFile, access } from 'node:fs/promises'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const cwd = fileURLToPath(new URL('..', import.meta.url))
const out = resolve(cwd, 'docs/mfalujo23/exam-followup-evidence/http')
const app = 'http://127.0.0.1:3007'
for (const name of ['.env', '.env.local', '.env.production', '.env.production.local', '.env.development', '.env.development.local']) {
  try { await access(resolve(cwd, name)); throw Error('LOCAL_ENV_FILE_PRESENT') }
  catch (error) { if (error.code !== 'ENOENT') throw error }
}
for (const port of [3007, 54328]) await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', () => reject(Error('EXAM_TEST_PORT_IN_USE')))
  probe.listen(port, '127.0.0.1', () => probe.close(resolve))
})
await mkdir(out, { recursive: true })
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ENABLE_OUTBOUND_SMS: 'false' }
for (const key of Object.keys(env)) if (/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|TWILIO_|VAPI_|GEMINI_|GOOGLE_AI_|PUBLIC_CALLBACK_URL$)/.test(key)) delete env[key]
const processes = []
function start(args, extra = {}) {
  const child = spawn(process.execPath, args, { cwd, env: { ...env, ...extra }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const entry = { child, log: '' }
  child.stdout.on('data', bytes => { entry.log += bytes.toString() })
  child.stderr.on('data', bytes => { entry.log += bytes.toString() })
  processes.push(entry); return entry
}
async function stop(entry) {
  if (entry.child.exitCode === null) { entry.child.kill(); await Promise.race([new Promise(resolve => entry.child.once('exit', resolve)), pause(3000)]) }
}
async function ready(url, expected = 200) {
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.status === expected) return }
    catch { /* Bounded local startup wait. */ }
    await pause(250)
  }
  throw Error('EXAM_LOOPBACK_STARTUP_FAILED')
}
const appEnv = { NODE_ENV: 'production', SUPABASE_URL: 'http://127.0.0.1:54328', SUPABASE_PUBLISHABLE_KEY: 'synthetic-midterm-public-key' }
const startApp = () => start(['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3007'], appEnv)
const checks = []
async function check(name, path, options, status, expectedBody) {
  console.log('CHECK ' + name)
  const response = await fetch(app + path, { ...options, signal: AbortSignal.timeout(20000) })
  const rawBody = await response.text()
  assert.equal(response.status, status, name)
  if (expectedBody) assert.deepEqual(JSON.parse(rawBody), expectedBody, name)
  checks.push({ name, path, method: options?.method ?? 'GET', status: response.status, headers: Object.fromEntries(['content-type', 'retry-after', 'cache-control'].map(key => [key, response.headers.get(key)])), body: rawBody })
  console.log('PASS ' + name + ': ' + response.status)
  await writeFile(resolve(out, 'partial-results.json'), JSON.stringify({ localOnly: true, checks }, null, 2) + '\n')
  return { response, rawBody }
}
try {
  start(['scripts/midterm-local-preview.mjs'], { MIDTERM_FIXTURE_PORT: '54328' })
  await ready('http://127.0.0.1:54328/_fixture')
  let next = startApp(); await ready(app + '/api/services')
  const services = await check('approved active public services', '/api/services', {}, 200)
  const serviceId = JSON.parse(services.rawBody).data[0].id
  const booking = { service_id: serviceId, client_email: 'fictional-capacity@example.test', requested_date: '2027-01-01', notes: 'Fictional isolated exam appointment request.' }
  for (let i = 1; i <= 31; i++) {
    const result = await check('capacity request ' + i, '/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking) }, i <= 30 ? 201 : 429, i <= 30 ? { message: 'Booking request submitted.' } : undefined)
    assert.ok(!result.rawBody.includes(booking.client_email), 'Receipt must not echo contact data')
    if (i === 31) assert.ok(Number(result.response.headers.get('retry-after')) > 0)
  }
  await stop(next)
  next = startApp(); await ready(app + '/api/services')
  const post = (body, headers = {}) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body })
  await check('unsupported body type', '/api/bookings', post('{}', { 'Content-Type': 'text/plain' }), 415)
  await check('actual oversize body', '/api/bookings', post(JSON.stringify({ notes: 'x'.repeat(17000) })), 413)
  await check('malformed JSON', '/api/bookings', post('{bad'), 400)
  await check('database-incompatible apostrophe email', '/api/bookings', post(JSON.stringify({ ...booking, client_email: "o'neal@example.test" })), 400)
  await check('supported percent email reaches actual local SQL insert', '/api/bookings', post(JSON.stringify({ ...booking, client_email: 'fictional%tag@example.test' })), 201, { message: 'Booking request submitted.' })
  await check('service sign-in required', '/api/services', post('{}'), 401)
  await check('admin booking sign-in required', '/api/admin/bookings', {}, 401)
  await check('unsupported booking method', '/api/bookings', { method: 'PUT' }, 405)
  for (const [token, expected] of [['synthetic-exam-profile-outage', 503], ['synthetic-exam-profile-denied', 403]]) {
    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    const body = JSON.stringify({ title: 'Fictional exam inspection', hourly_rate: 50, duration_minutes: 60, coverage_radius_miles: 10 })
    const expectedBody = { error: 'Account authorization is temporarily unavailable.' }
    await check(token + ' service', '/api/services', { method: 'POST', headers, body }, expected, expectedBody)
    await check(token + ' admin service', '/api/admin/services', { method: 'PATCH', headers, body: JSON.stringify({ service_id: serviceId, status: 'approved' }) }, expected, expectedBody)
    await check(token + ' admin bookings', '/api/admin/bookings', { headers }, expected, expectedBody)
  }
  await check('verified synthetic admin still receives bounded type rejection', '/api/admin/services', { method: 'PATCH', headers: { Authorization: 'Bearer synthetic-exam-admin-session', 'Content-Type': 'text/plain' }, body: '{}' }, 415)
  const report = { localOnly: true, fictionalDataOnly: true, hostedAuthVerified: false, productionNextHttp: true, actualDisposablePostgreSQL: true, providerCalls: 0, capacityLimitation: '30 per process per60seconds; not a distributed/user/IP limiter and does not cover direct PostgREST writes', checks }
  await writeFile(resolve(out, 'results.json'), JSON.stringify(report, null, 2) + '\n')
  await writeFile(resolve(out, 'raw-responses.txt'), checks.map(item => `${item.name}\n${item.method} ${item.path}\nHTTP ${item.status}\n${Object.entries(item.headers).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${item.body}`).join('\n\n') + '\n')
  console.log(`EXAM PRODUCTION LOOPBACK HTTP: ${checks.length} checks PASS;30accepted,31st429;profile503/403;no cloud/provider calls.`)
} finally {
  for (const entry of processes.toReversed()) await stop(entry)
  for (let i = 0; i < processes.length; i++) await writeFile(resolve(out, `process-${i + 1}.log`), processes[i].log)
}
