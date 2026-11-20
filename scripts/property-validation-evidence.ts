import fixtures from '../data/generated/mfalujo23-synthetic-properties.json'
import { PropertySchema, type PropertyListing } from '../src/schemas/property'

const valid = fixtures[0]
const missingId: Record<string, unknown> = { ...valid }
delete missingId.property_id
const cases: Record<string, unknown> = {
  valid,
  missing_id: missingId,
  negative_price_business_rule: { ...valid, price: -1 },
  malformed_zip: { ...valid, zip_code: 'ABCDE' },
  unknown_field: { ...valid, approved: true },
  numeric_string_type_mismatch: { ...valid, price: '425000' },
}

console.log(`Actual local validation evidence, ${new Date().toISOString()}`)
console.log('Fixtures are Codex-authored synthetic classroom data, not Gemini output.')
for (const [name, payload] of Object.entries(cases)) {
  const result = PropertySchema.safeParse(payload)
  console.log(JSON.stringify({ case: name, payload, success: result.success, issues: result.success ? [] : result.error.issues }, null, 2))
}

console.log('Deliberately unsafe assertion demonstration (not used in the application):')
const asserted = cases.numeric_string_type_mismatch as PropertyListing
try {
  console.log(asserted.price.toFixed(2))
} catch (error: unknown) {
  console.log(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
}
console.log('A negative number does not crash toFixed but violates the price rule:')
console.log((-1).toFixed(2))
