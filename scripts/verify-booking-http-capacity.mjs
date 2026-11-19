import { spawn } from 'node:child_process'
import { setTimeout as pause } from 'node:timers/promises'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:net'
import assert from 'node:assert/strict'
import { assertCleanSourceEnvironment } from '../config/source-preflight.mjs'

const cwd = fileURLToPath(new URL('..', import.meta.url))
const out = resolve(cwd, 'docs/mfalujo23/release-evidence/booking-capacity')
await assertCleanSourceEnvironment(cwd)
for (const port of [3004, 54326]) {
  await new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', () => reject(Error('LOCAL_TEST_PORT_IN_USE')))
    probe.listen(port, '127.0.0.1', () => probe.close(resolve))
  })
}
await mkdir(out, { recursive: true })
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ENABLE_OUTBOUND_SMS: 'false', ENABLE_ANALYTICS: 'false' }
for (const key of Object.keys(env)) if (/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|TWILIO_|VAPI_|GEMINI_|GOOGLE_AI_|PUBLIC_CALLBACK_URL$)/.test(key)) delete env[key]
const processes = []
function start(args, extra) {
  const child = spawn(process.execPath, args, { cwd, env: { ...env, ...extra }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''; child.stdout.on('data', b => { log += b.toString() }); child.stderr.on('data', b => { log += b.toString() })
  processes.push({ child, readLog: () => log }); return child
}
async function ready(url) {
  for (let count = 0; count < 80; count++) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.status < 500) return }
    catch { /* Local startup only. */ }
    await pause(250)
  }
  throw Error('LOOPBACK_TEST_STARTUP_FAILED')
}
const checks = []
try {
  start(['scripts/midterm-local-preview.mjs'], { MIDTERM_FIXTURE_PORT: '54326' })
  await ready('http://127.0.0.1:54326/rest/v1/services')
  start(['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3004'], {
    NODE_ENV: 'production', SUPABASE_URL: 'http://127.0.0.1:54326', SUPABASE_PUBLISHABLE_KEY: 'synthetic-midterm-public-key',
  })
  await ready('http://127.0.0.1:3004/api/health')
  const response = await fetch('http://127.0.0.1:3004/api/services')
  const services = await response.json(); assert.equal(response.status, 200); assert.ok(services.data[0].id)
  const payload = { service_id: services.data[0].id, client_email: 'fictional-capacity@example.test', requested_date: '2027-01-01', notes: 'Fictional isolated capacity verification only.' }
  for (let request = 1; request <= 31; request++) {
    const result = await fetch('http://127.0.0.1:3004/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const body = await result.text()
    assert.equal(result.status, request <= 30 ? 201 : 429)
    if (request === 1 || request === 30 || request === 31) checks.push({ request, status: result.status, headers: Object.fromEntries(['content-type','retry-after','cache-control','x-content-type-options'].map(name => [name,result.headers.get(name)])), body })
    if (request === 31) assert.ok(Number(result.headers.get('retry-after')) > 0)
  }
  await writeFile(resolve(out, 'http-results.json'), JSON.stringify({ localOnly: true, fictionalDataOnly: true, providerCalls: 0, method: 'POST', path: '/api/bookings', attempts: 31, accepted: 30, rejected: 1, checks }, null, 2) + '\n')
  await writeFile(resolve(out, 'raw-responses.txt'), checks.map(r => `REQUEST ${r.request}\nHTTP ${r.status}\n${Object.entries(r.headers).map(([k,v]) => `${k}: ${v}`).join('\n')}\n\n${r.body}`).join('\n\n') + '\n')
  console.log('ACTUAL LOOPBACK CAPACITY: 30 HTTP201; request31 HTTP429 with Retry-After; fictional disposable DB only.')
} finally {
  for (const { child } of processes.toReversed()) {
    if (child.exitCode === null) { child.kill(); await Promise.race([new Promise(resolve => child.once('exit', resolve)), pause(3000)]) }
  }
  for (let i = 0; i < processes.length; i++) await writeFile(resolve(out, `process-${i + 1}.log`), processes[i].readLog())
}
