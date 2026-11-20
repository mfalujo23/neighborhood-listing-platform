import { z } from 'zod'

export const PublicListingSchema = z.strictObject({
  id: z.uuid(),
  title: z.string().min(1).max(300),
  description: z.string().max(10000).nullable(),
  street: z.string().min(1).max(300),
  city: z.string().min(1).max(160),
  state: z.string().regex(/^[A-Z]{2}$/),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/),
  price: z.number().finite().nonnegative(),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().finite().nonnegative(),
  square_feet: z.number().int().nonnegative(),
  amenities: z.array(z.string().max(300)).max(100),
  image_url: z.string().max(2048).nullable(),
  approved: z.literal(true),
  created_at: z.iso.datetime({ offset: true }),
})

export const PublicListingsResponseSchema = z.strictObject({
  data: z.array(PublicListingSchema).max(1000),
})

export type PublicListing = z.infer<typeof PublicListingSchema>
