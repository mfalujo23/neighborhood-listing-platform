import { NextResponse } from 'next/server'
import { BookingCreateSchema } from '@/schemas/booking'
import { createSupabaseUserClient } from '@/lib/supabaseServer'
import { bookingRequestBudget, JsonBodyError, readJsonBody } from '@/lib/request-controls'

export async function POST(request: Request) {
  const capacity = bookingRequestBudget.take()
  if (!capacity.allowed) {
    return NextResponse.json(
      { error: 'Too many booking requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(capacity.retryAfter), 'Cache-Control': 'no-store' } },
    )
  }
  let body: unknown

  try {
    body = await readJsonBody(request)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof JsonBodyError ? error.message : 'Request body must be valid JSON.' },
      { status: error instanceof JsonBodyError ? error.status : 400 },
    )
  }

  const parsed = BookingCreateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid booking details.', details: parsed.error.issues },
      { status: 400 },
    )
  }

  const url = process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    return NextResponse.json(
      { error: 'Server configuration is missing.' },
      { status: 500 },
    )
  }

  try {
    const supabase = createSupabaseUserClient()

    const { error } = await supabase.from('bookings').insert({
      service_id: parsed.data.service_id,
      client_email: parsed.data.client_email,
      requested_date: parsed.data.requested_date,
      notes: parsed.data.notes,
    })

    if (error) {
      console.error('Booking insert failed', { code: error.code })
      const status = error.code === '42501' ? 403 : error.code?.startsWith('23') ? 400 : 503
      return NextResponse.json(
        { error: 'Could not submit booking request.' },
        { status },
      )
    }

    return NextResponse.json(
      { message: 'Booking request submitted.' },
      { status: 201 },
    )
  } catch {
    console.error('Booking route failed')
    return NextResponse.json(
      { error: 'Server configuration or request error.' },
      { status: 500 },
    )
  }
}
