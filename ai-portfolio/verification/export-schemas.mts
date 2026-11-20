import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve, join } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const project = resolve(process.argv[2] || process.cwd())
const output = resolve(process.argv[3] || join(project, 'ai-portfolio/structured-output'))
const require = createRequire(join(project, 'package.json'))
const { z } = require('zod')
const propertyPath = join(project, 'src/schemas/property.ts')
const sponsorPath = join(project, 'src/lib/sponsorRuntime.ts')
const { PropertySchema, PropertyCollectionSchema } = await import(pathToFileURL(propertyPath).href)
const { SponsorContextSchema } = await import(pathToFileURL(sponsorPath).href)
const property = z.toJSONSchema(PropertySchema, { target: 'draft-7' })
const collection = z.toJSONSchema(PropertyCollectionSchema, { target: 'draft-7' })
const sponsor = z.toJSONSchema(SponsorContextSchema, { target: 'draft-7' })
assert.deepEqual(property, JSON.parse(await readFile(join(project, 'src/schemas/property.schema.json'), 'utf8')))
const samples = JSON.parse(await readFile(join(output, 'sample-response.json'), 'utf8'))
assert.equal(PropertyCollectionSchema.safeParse(samples).success, true)
assert.equal(samples.length, 5)
const context = { propertyId: '70000000-0000-4000-8000-000000000001', targetZip: '90032', placement: 'sidebar' }
const cases = [
  { name: 'valid fictional placement context', input: context, expected: true },
  { name: 'ten-digit ZIP rejected', input: { ...context, targetZip: '9003212345' }, expected: false },
  { name: 'unknown property rejected', input: { ...context, unsafe_override: true }, expected: false },
]
const results = cases.map(row => {
  const parsed = SponsorContextSchema.safeParse(row.input)
  assert.equal(parsed.success, row.expected, row.name)
  return { name: row.name, success: parsed.success, issues: parsed.success ? [] : parsed.error.issues }
})
await mkdir(output, { recursive: true })
await writeFile(join(output, 'property-schema.json'), JSON.stringify(property, null, 2) + '\n')
await writeFile(join(output, 'property-collection-schema.json'), JSON.stringify(collection, null, 2) + '\n')
await writeFile(join(output, 'sponsor-schema.json'), JSON.stringify(sponsor, null, 2) + '\n')
const data = {
  node: process.version,
  zod: require('zod/package.json').version,
  source: [
    { path: 'src/schemas/property.ts', sha256: createHash('sha256').update(await readFile(propertyPath)).digest('hex') },
    { path: 'src/lib/sponsorRuntime.ts', sha256: createHash('sha256').update(await readFile(sponsorPath)).digest('hex') },
  ],
  propertyExportMatchesCanonicalFile: true,
  exactGeminiSampleRecordsAccepted: samples.length,
  sponsorScope: 'Actual strict placement-input SponsorContextSchema, not a full sponsor entity/output contract.',
  results,
  scope: 'Local schema export/validation only; no provider or database request.',
  passed: true,
}
await writeFile(join(output, '../verification/schema-export-and-validation.json'), JSON.stringify(data, null, 2) + '\n')
console.log(JSON.stringify(data, null, 2))
