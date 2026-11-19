import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import rawFixtures from '../../data/generated/mfalujo23-synthetic-properties.json'
import { parsePropertyPayload } from '../lib/api'
import { PropertySchema, validatePropertyCollection } from '../schemas/property'

const valid = rawFixtures[0]

describe('strict property exchange contract at the rendering boundary', () => {
  test('accepts all five explicitly synthetic fixtures without coercion', () => {
    const result = validatePropertyCollection(rawFixtures)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual(rawFixtures)
    expect(rawFixtures).toHaveLength(5)
  })

  test('rejects a missing property_id', () => {
    const missingId: Record<string, unknown> = { ...valid }
    delete missingId.property_id
    expect(PropertySchema.safeParse(missingId).success).toBe(false)
  })

  test('rejects a negative price although its TypeScript primitive type is number', () => {
    expect(PropertySchema.safeParse({ ...valid, price: -1 }).success).toBe(false)
  })

  test('rejects a malformed ZIP', () => {
    expect(PropertySchema.safeParse({ ...valid, zip_code: 'ABCDE' }).success).toBe(false)
  })

  test('rejects unknown top-level fields rather than silently stripping them', () => {
    expect(PropertySchema.safeParse({ ...valid, approved: true }).success).toBe(false)
  })

  test('rejects a runtime numeric-string mismatch before a consumer calls toFixed', () => {
    expect(() => parsePropertyPayload({ ...valid, price: '425000' })).toThrow()
  })

  test('rejects empty required address strings', () => {
    expect(PropertySchema.safeParse({ ...valid, street: '   ' }).success).toBe(false)
  })

  test('rejects an unknown state and uncontrolled amenities', () => {
    expect(PropertySchema.safeParse({ ...valid, state: 'ZZ' }).success).toBe(false)
    expect(PropertySchema.safeParse({ ...valid, amenities: ['free_text'] }).success).toBe(false)
  })

  test('rejects duplicate amenities and unknown nested sponsor fields', () => {
    expect(PropertySchema.safeParse({ ...valid, amenities: ['parking', 'parking'] }).success).toBe(false)
    expect(PropertySchema.safeParse({ ...valid, local_sponsors: [{ ...valid.local_sponsors[0], approved: true }] }).success).toBe(false)
  })

  test('rejects malformed identifiers and fractional bedroom/area values', () => {
    expect(PropertySchema.safeParse({ ...valid, property_id: 'not-a-uuid' }).success).toBe(false)
    expect(PropertySchema.safeParse({ ...valid, bedrooms: 1.5 }).success).toBe(false)
    expect(PropertySchema.safeParse({ ...valid, square_feet: 12.5 }).success).toBe(false)
  })

  test('accepts zero-valued nonnegative numeric fields and ZIP+4', () => {
    expect(PropertySchema.safeParse({ ...valid, price: 0, bedrooms: 0, bathrooms: 0, square_feet: 0, zip_code: '90032-1234' }).success).toBe(true)
  })

  test('fails the whole collection closed if one record is invalid', () => {
    const result = validatePropertyCollection([valid, { ...valid, price: -1 }])
    expect(result.success).toBe(false)
  })

  test('keeps the exported JSON Schema synchronized with the runtime source', () => {
    const exported: unknown = JSON.parse(readFileSync(new URL('../schemas/property.schema.json', import.meta.url), 'utf8'))
    expect(exported).toEqual(z.toJSONSchema(PropertySchema, { target: 'draft-7' }))
  })
})
