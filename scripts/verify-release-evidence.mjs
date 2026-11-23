import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { assessAccessibilityEvidence, validateReleaseRecord } from '../src/release/gates.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const expected = process.argv[process.argv.indexOf('--commit') + 1]
const reportDir = new URL('../docs/mfalujo23/release-evidence/', import.meta.url)
let result
try {
  if (!process.argv.includes('--commit') || !/^[0-9a-f]{40}$/i.test(expected ?? '')) throw new Error('RELEASE_COMMIT_REQUIRED')
  let input
  try { input = JSON.parse(await readFile(new URL('release-record.json', reportDir), 'utf8')) }
  catch { throw new Error('RELEASE_EVIDENCE_RECORD_REQUIRED') }
  result = validateReleaseRecord(input, expected)
  if (!result.allowed) throw new Error(result.reason)
  for (const [gateName, gate] of Object.entries(result.record.gates)) {
    for (const evidence of gate.evidence) {
      const path = resolve(root, evidence.path)
      const allowedRoot = resolve(root, 'docs/mfalujo23/release-evidence') + sep
      if (!path.startsWith(allowedRoot)) throw new Error('INVALID_EVIDENCE_PATH')
      const bytes = await readFile(path)
      const hash = createHash('sha256').update(bytes).digest('hex')
      if (hash !== evidence.sha256) throw new Error('EVIDENCE_HASH_MISMATCH')
      if (gateName === 'accessibility' && !assessAccessibilityEvidence(JSON.parse(bytes.toString('utf8'))).passed) throw new Error('AXE_VIOLATIONS_OR_INCOMPLETE_CHECKS')
    }
  }
  result = { allowed: true, sourceCommit: expected, automaticDeploymentPerformed: false }
  console.log('RELEASE_EVIDENCE_ACCEPTED: recorded source, local and hosted gates are complete; this command performs no deployment.')
} catch (failure) {
  result = { allowed: false, sourceCommit: expected ?? null, reason: failure.message, automaticDeploymentPerformed: false }
  console.error('RELEASE_BLOCKED: ' + failure.message)
  process.exitCode = 1
}
await mkdir(reportDir, { recursive: true })
await writeFile(new URL('release-decision.json', reportDir), JSON.stringify(result, null, 2) + '\n')
