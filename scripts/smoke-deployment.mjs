import { mkdir, writeFile } from 'node:fs/promises'
import { smokeDeployment } from '../src/release/smoke.ts'

const arg = (name) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined
let result
try {
  result = await smokeDeployment(arg('--base'), arg('--commit'), { applicationOnly: process.argv.includes('--application-only') })
  if (!result.passed) process.exitCode = 1
} catch { result = { passed: false, reason: 'SMOKE_CONFIGURATION_INVALID' }; process.exitCode = 1 }
const directory = new URL('../docs/mfalujo23/release-evidence/', import.meta.url)
await mkdir(directory, { recursive: true })
await writeFile(new URL('deployment-smoke.json', directory), JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2) + '\n')
console.log(JSON.stringify(result))
