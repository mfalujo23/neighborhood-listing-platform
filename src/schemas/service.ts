import { z } from 'zod'

export const ServiceCreateSchema = z.object({
  title: z.string().trim().min(5).max(200),
  hourly_rate: z.number().finite().nonnegative().max(99999999.99),
  duration_minutes: z.number().int().min(15).max(2147483647),
  coverage_radius_miles: z.number().int().positive().max(2147483647),
}).strict()

export type ServiceCreateInput = z.infer<typeof ServiceCreateSchema>
