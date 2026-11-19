import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { assessAccessibilityEvidence } from '../src/release/gates.ts'
const paths = process.argv.slice(2)
if (!paths.length) { console.error('AXE_REPORT_PATH_REQUIRED'); process.exitCode = 1 }
for (const path of paths) {
  let result
  try { result = assessAccessibilityEvidence(JSON.parse(await readFile(path, 'utf8'))) }
  catch { result = { passed: false, reason: 'AXE_REPORT_UNREADABLE' } }
  console.log(JSON.stringify({ artifact: basename(path), ...result }))
  if (!result.passed) process.exitCode = 1
}
