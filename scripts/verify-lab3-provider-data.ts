import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { PropertySchema, PropertyCollectionSchema } from '../src/schemas/property'

const directory = path.resolve('docs/mfalujo23/ai-experiments/lab3')
const labels = ['valid', 'missing_property_id', 'negative_price', 'malformed_zip', 'unknown_field']
const expectedCodes = [null, 'invalid_type', 'too_small', 'invalid_format', 'unrecognized_keys']
const expectedPaths = [null, ['property_id'], ['price'], ['zip_code'], []]
const reports = []
const transcript: string[] = []
function emit(line: string) { transcript.push(line); console.log(line) }
for (const provider of ['gemini', 'chatgpt']) {
  const file = path.join(directory, 'extracted', `${provider}-returned-property-examples.json`)
  const examples: unknown[] = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.equal(examples.length, 5)
  const cases = examples.map((input, index) => {
    const result = PropertySchema.safeParse(input)
    assert.equal(result.success, index === 0, `${provider}/${labels[index]}`)
    const issues = result.success ? [] : result.error.issues
    if (index > 0) {
      assert.equal(issues.length, 1, `${provider}/${labels[index]} has only its intended fault`)
      assert.equal(issues[0].code, expectedCodes[index])
      assert.deepEqual(issues[0].path, expectedPaths[index])
    }
    const record = { label: labels[index], success: result.success, issues }
    emit(`${provider}/${labels[index]}: ${result.success ? 'PASS' : 'REJECT'} ${JSON.stringify(issues)}`)
    return record
  })
  reports.push({ provider, extractedExamplesSha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex'), cases })
}
const first = JSON.parse(fs.readFileSync(path.join(directory, 'gemini-seed-attempt1.raw.json'), 'utf8'))
const second = JSON.parse(fs.readFileSync(path.join(directory, 'gemini-seed-attempt2.raw.json'), 'utf8'))
const rejected = PropertyCollectionSchema.safeParse(first)
const accepted = PropertyCollectionSchema.safeParse(second)
assert.equal(rejected.success, false, 'Encoded-response envelope is not silently repaired')
assert.equal(accepted.success, true)
assert.equal(Array.isArray(second) ? second.length : 0, 5)
emit(`gemini/seed_attempt1_raw_envelope: REJECT ${JSON.stringify(rejected.success ? [] : rejected.error.issues)}`)
emit(`gemini/seed_attempt2_array: PASS ${second.length} records`)
const output = { canonicalSchema: 'src/schemas/property.ts', canonicalSchemaSha256: createHash('sha256').update(fs.readFileSync(path.resolve('src/schemas/property.ts'))).digest('hex'), providerExamples: reports, seedAttempt1: { success: rejected.success, issues: rejected.success ? [] : rejected.error.issues }, seedAttempt2: { success: accepted.success, records: second.length, sha256: createHash('sha256').update(fs.readFileSync(path.join(directory, 'gemini-seed-attempt2.raw.json'))).digest('hex') } }
fs.writeFileSync(path.join(directory, 'extracted', 'canonical-zod-validation-results.json'), JSON.stringify(output, null, 2) + '\n')
fs.writeFileSync(path.join(directory, 'extracted', 'canonical-zod-validation-terminal.txt'), transcript.join('\n') + '\n')
