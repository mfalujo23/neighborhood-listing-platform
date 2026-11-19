import { z } from 'zod'

// Classroom exchange contract. JSON Schema is generated from this file.
export const AMENITY_VALUES = [
  'parking', 'pool', 'garden', 'balcony', 'air_conditioning', 'pet_friendly',
] as const

export const STATE_VALUES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI',
  'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN',
  'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
  'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
] as const

const AmenitiesSchema = z.array(z.enum(AMENITY_VALUES))
  .refine((items) => new Set(items).size === items.length, {
    message: 'Amenities must not contain duplicates.',
  })
  .meta({ uniqueItems: true })

export const LocalSponsorSchema = z.strictObject({
  sponsor_id: z.uuid(),
  name: z.string().trim().min(1).max(100),
})

export const PropertySchema = z.strictObject({
  property_id: z.uuid(),
  street: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(80),
  state: z.enum(STATE_VALUES),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Use a US ZIP or ZIP+4 code.'),
  price: z.number().finite().nonnegative(),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().finite().nonnegative(),
  square_feet: z.number().int().nonnegative(),
  amenities: AmenitiesSchema,
  local_sponsors: z.array(LocalSponsorSchema),
}).meta({
  title: 'PropertyListing',
  description: 'Strict synthetic classroom listing exchange contract; not a real property offer.',
})

export const PropertyCollectionSchema = z.array(PropertySchema).min(1)
export type PropertyListing = z.infer<typeof PropertySchema>

export function validatePropertyCollection(input: unknown) {
  return PropertyCollectionSchema.safeParse(input)
}
