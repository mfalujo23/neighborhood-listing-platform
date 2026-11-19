import { z } from 'zod'

// Matches the examination's PostgreSQL email CHECK. This validates format,
// not mailbox ownership or delivery.
export const BookingEmailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

export const BookingCreateSchema = z.object({
  service_id: z.string().uuid(),
  client_email: z.string().trim().max(254).regex(BookingEmailPattern, 'Enter an email address in the supported format.'),
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
  }, 'Choose a valid calendar date.'),
  notes: z.string().trim().min(10).max(2000),
}).strict()

export const BookingReceiptSchema = z.object({
  message: z.literal('Booking request submitted.'),
}).strict()

export type BookingCreateInput = z.infer<typeof BookingCreateSchema>
