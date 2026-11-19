import { NextResponse } from 'next/server'
import { ServiceCreateSchema, ServiceListResponseSchema } from '@/schemas/service'
import { createSupabaseUserClient as createUserClient } from '@/lib/supabaseServer'

export async function GET() {
  try {
    const supabase = createUserClient()
    const { data, error } = await supabase
      .from('services')
      .select('id, title, hourly_rate, duration_minutes, coverage_radius_miles')
      .eq('status', 'approved')
      .eq('coverage_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Could not retrieve services.' },
        { status: 500 },
      )
    }

    const parsed = ServiceListResponseSchema.safeParse({ data })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Service data is unavailable.' }, { status: 502 })
    }
    return NextResponse.json(parsed.data, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Server configuration or request error.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization')
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)

  if (!bearer || !authorization) {
    return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: 400 },
    )
  }

  const parsed = ServiceCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid service data.', details: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    const supabase = createUserClient(authorization)
    const { data: authData, error: authError } =
      await supabase.auth.getUser(bearer[1])

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sign-in is required.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (
      profileError ||
      !profile ||
      !['provider', 'merchant'].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: 'A provider or merchant account is required.' },
        { status: 403 },
      )
    }

    const { data, error } = await supabase
      .from('services')
      .insert({
        provider_id: authData.user.id,
        ...parsed.data,
        status: 'draft',
      })
      .select(
        'id, provider_id, title, hourly_rate, duration_minutes, coverage_radius_miles, status, created_at',
      )
      .single()

    if (error) {
      const status = error.code === '42501' ? 403 : error.code?.startsWith('23') ? 400 : 500
      return NextResponse.json(
        { error: 'Could not create service.' },
        { status },
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Server configuration or request error.' },
      { status: 500 },
    )
  }
}
