import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { assertCleanSourceEnvironment } from '../config/source-preflight.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
await assertCleanSourceEnvironment(root)
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ENABLE_OUTBOUND_SMS: 'false', ENABLE_ANALYTICS: 'false', ANALYTICS_FIXTURE_MODE: 'false' }
for (const key of Object.keys(env)) {
  if (/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|TWILIO_|VAPI_|GEMINI_|GOOGLE_AI_|PUBLIC_CALLBACK_URL$)/.test(key)) delete env[key]
}
const phases = [
  ['unit and component tests', ['node_modules/vitest/vitest.mjs', 'run', 'src/test', '--no-cache', '--no-fsModuleCache']],
  ['webhook signature, consent and idempotency tests', ['--test', 'tests/webhook.test.js']],
  ['backend PostgreSQL roles', ['scripts/verify-local-backend.mjs']],
  ['midterm fresh and legacy PostgreSQL roles', ['scripts/verify-local-midterm.mjs']],
  ['booking email PostgreSQL/runtime contract', ['scripts/verify-booking-email-contract.mjs']],
  ['sponsor PostgreSQL eligibility and roles', ['scripts/verify-local-sponsors.mjs']],
  ['analytics PostgreSQL privacy and aggregates', ['scripts/verify-local-analytics.mjs']],
  ['canonical provider and legacy read-only analytics roles', ['scripts/verify-local-analytics-provider.mjs']],
  ['media approval-record validation', ['scripts/verify-mfalujo23-media-records.mjs']],
  ['fictional local backup recovery and restored RLS', ['scripts/verify-local-restore.mjs']],
]
const results = []
let failed = false
for (const [name, args] of phases) {
  const start = Date.now()
  console.log('\nCHECK: ' + name)
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit', shell: false })
    child.once('error', () => resolve(1))
    child.once('exit', (code) => resolve(code ?? 1))
  })
  results.push({ name, command: ['node', ...args], exit: code, durationMs: Date.now() - start })
  if (code !== 0) { failed = true; break }
}
await mkdir(new URL('../docs/mfalujo23/release-evidence/', import.meta.url), { recursive: true })
await writeFile(new URL('../docs/mfalujo23/release-evidence/combined-tests.json', import.meta.url), JSON.stringify({
  localOnly: true, providerFlagsDisabled: true, credentialsOmittedFromChildEnvironment: true, executedAt: new Date().toISOString(),
  status: failed ? 'failed' : 'passed', results,
  limitation: 'Local assertions and disposable PostgreSQL only; no hosted authentication, deployment, human UAT or provider call is established.',
}, null, 2) + '\n')
if (failed) process.exitCode = 1
