import { NextResponse } from 'next/server'
import { BookingCreateSchema } from '@/schemas/booking'
import { createSupabaseUserClient } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 },
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
