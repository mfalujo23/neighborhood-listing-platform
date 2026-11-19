import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { assertCleanSourceEnvironment } from '../config/source-preflight.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
await assertCleanSourceEnvironment(root)
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ENABLE_OUTBOUND_SMS: 'false', ENABLE_ANALYTICS: 'false', ANALYTICS_FIXTURE_MODE: 'false' }
for (const key of Object.keys(env)) if (/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|TWILIO_|VAPI_|GEMINI_|GOOGLE_AI_|PUBLIC_CALLBACK_URL$)/.test(key)) delete env[key]
const phases = [
  ['strict lint', ['node_modules/eslint/bin/eslint.js', 'src', 'config', 'next.config.mjs', 'scripts/verify-all.mjs', 'scripts/verify-release.mjs', '--max-warnings', '0']],
  ['TypeScript', ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['all local tests', ['scripts/verify-all.mjs']],
  ['production build', ['node_modules/next/dist/bin/next', 'build', '--webpack']],
  ['actual fictional loopback booking API capacity', ['scripts/verify-booking-http-capacity.mjs']],
]
const results = []
let failed = false
for (const [name, args] of phases) {
  console.log('\nRELEASE CHECK: ' + name)
  const start = Date.now()
  const code = await new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit', shell: false })
    child.once('error', () => resolve(1))
    child.once('exit', (code) => resolve(code ?? 1))
  })
  results.push({ name, command: ['node', ...args], exit: code, durationMs: Date.now() - start })
  if (code !== 0) { failed = true; break }
}
await mkdir(new URL('../docs/mfalujo23/release-evidence/', import.meta.url), { recursive: true })
await writeFile(new URL('../docs/mfalujo23/release-evidence/source-gates.json', import.meta.url), JSON.stringify({
  checkedAt: new Date().toISOString(), status: failed ? 'failed' : 'passed', results,
  deploymentAuthorizedByThisScript: false,
  remainingGates: ['Rendered-browser accessibility and core flows', 'Hosted smoke checks', 'Owner-approved rollback verification', 'Human usability/review evidence'],
}, null, 2) + '\n')
if (failed) process.exitCode = 1
