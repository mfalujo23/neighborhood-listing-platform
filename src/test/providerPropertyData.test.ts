import { describe, expect, test } from 'vitest'
import geminiExamples from '../../docs/mfalujo23/ai-experiments/lab3/extracted/gemini-returned-property-examples.json'
import chatgptExamples from '../../docs/mfalujo23/ai-experiments/lab3/extracted/chatgpt-returned-property-examples.json'
import firstSeedResponse from '../../docs/mfalujo23/ai-experiments/lab3/gemini-seed-attempt1.raw.json'
import acceptedSeed from '../../data/generated/gemini-ai-studio-seed-attempt2.json'
import { PropertySchema, validatePropertyCollection } from '../schemas/property'

const labels = ['valid', 'missing property_id', 'negative price', 'malformed ZIP', 'unknown field']
const expectedCodes = [null, 'invalid_type', 'too_small', 'invalid_format', 'unrecognized_keys']
const expectedPaths = [null, ['property_id'], ['price'], ['zip_code'], []]

for (const [provider, examples] of [['Gemini', geminiExamples], ['ChatGPT', chatgptExamples]] as const) {
  describe(`${provider} returned property examples`, () => {
    examples.forEach((example, index) => {
      test(labels[index], () => {
        const result = PropertySchema.safeParse(example)
        expect(result.success).toBe(index === 0)
        if (!result.success) {
          expect(result.error.issues).toHaveLength(1)
          expect(result.error.issues[0].code).toBe(expectedCodes[index])
          expect(result.error.issues[0].path).toEqual(expectedPaths[index])
        }
      })
    })
  })
}

test('rejects the first raw provider envelope instead of silently repairing its shape', () => {
  const result = validatePropertyCollection(firstSeedResponse)
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.error.issues[0].code).toBe('invalid_type')
    expect(result.error.issues[0].path).toEqual([])
  }
})

test('accepts all five second-attempt records with unique UI identifiers', () => {
  const result = validatePropertyCollection(acceptedSeed)
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data).toHaveLength(5)
    expect(new Set(result.data.map((listing) => listing.property_id)).size).toBe(5)
    expect(result.data).toEqual(acceptedSeed)
  }
})
