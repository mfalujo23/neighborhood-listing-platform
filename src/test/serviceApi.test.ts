import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const transport = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: transport.createClient }))

import { GET, POST } from '../app/api/services/route'
import { ServiceCreateSchema } from '../schemas/service'
import { POST as createBooking } from '../app/api/bookings/route'

const owner = '11111111-1111-4111-8111-111111111111'
const valid = { title: 'Fictional home inspection', hourly_rate: 50, duration_minutes: 60, coverage_radius_miles: 10 }

function fixture(role = 'provider', validSession = true) {
  const serviceChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [{ id: 'local-service', ...valid }], error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'local-service', provider_id: owner, ...valid, status: 'draft' }, error: null }),
  }
  const profileChain = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { role }, error: null }),
  }
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: validSession ? { id: owner } : null }, error: validSession ? null : { message: 'Synthetic expired session' } }) },
    from: vi.fn((table: string) => table === 'profiles' ? profileChain : serviceChain),
  }
  transport.createClient.mockReturnValue(client)
  return { client, serviceChain }
}

function request(body: unknown, authorized = true) {
  return new Request('http://local.test/api/services', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: 'Bearer synthetic-provider-token' } : {}) },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://synthetic-backend.invalid')
  vi.stubEnv('SUPABASE_ANON_KEY', 'synthetic-public-key-not-a-credential')
})
afterEach(() => vi.unstubAllEnvs())

describe('Service contract and route guards (local mocked transport, no provider requests)', () => {
  it.each([
    { ...valid, title: 'tiny' }, { ...valid, hourly_rate: -1 },
    { ...valid, duration_minutes: 14 }, { ...valid, duration_minutes: 15.5 },
    { ...valid, coverage_radius_miles: 0 }, { ...valid, hourly_rate: Infinity },
    { ...valid, provider_id: owner }, { ...valid, status: 'approved' },
    { title: 'Legacy incompatible payload', description: 'old schema', category: 'old' },
  ])('rejects incompatible/invalid/extra payload %j', (body) => {
    expect(ServiceCreateSchema.safeParse(body).success).toBe(false)
  })
  it('requires a Bearer authorization header before creating a client', async () => {
    expect((await POST(request(valid, false))).status).toBe(401)
    expect(transport.createClient).not.toHaveBeenCalled()
  })
  it('rejects unknown fields with structured400 and no insert', async () => {
    expect((await POST(request({ ...valid, status: 'approved' }))).status).toBe(400)
    expect(transport.createClient).not.toHaveBeenCalled()
  })
  it('rejects a synthetic expired session', async () => {
    const f = fixture('provider', false)
    expect((await POST(request(valid))).status).toBe(401)
    expect(f.serviceChain.insert).not.toHaveBeenCalled()
  })
  it('rejects a client account even with a valid session', async () => {
    const f = fixture('client')
    expect((await POST(request(valid))).status).toBe(403)
    expect(f.serviceChain.insert).not.toHaveBeenCalled()
  })
  it.each(['provider', 'merchant'])('binds a %s draft to verified session identity', async (role) => {
    const f = fixture(role)
    const response = await POST(request(valid))
    expect(response.status).toBe(201)
    expect(f.client.auth.getUser).toHaveBeenCalledWith('synthetic-provider-token')
    expect(f.serviceChain.insert).toHaveBeenCalledWith({ provider_id: owner, ...valid, status: 'draft' })
    expect(transport.createClient).toHaveBeenCalledWith('https://synthetic-backend.invalid', 'synthetic-public-key-not-a-credential', expect.any(Object))
  })
  it('public GET selects only public fields and requires active approved coverage', async () => {
    const f = fixture()
    expect((await GET()).status).toBe(200)
    expect(f.serviceChain.select).toHaveBeenCalledWith('id, title, hourly_rate, duration_minutes, coverage_radius_miles')
    expect(f.serviceChain.eq).toHaveBeenCalledWith('status', 'approved')
    expect(f.serviceChain.eq).toHaveBeenCalledWith('coverage_active', true)
  })
  it.each([['42501', 403], ['23514', 400], ['42P01', 500]] as const)('maps database code%s to HTTP%i', async (code, status) => {
    const f = fixture()
    f.serviceChain.single.mockResolvedValue({ data: null, error: { code } })
    expect((await POST(request(valid))).status).toBe(status)
  })
  it('booking insertion returns a receipt without selecting or echoing contact data', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ insert })
    transport.createClient.mockReturnValue({ from })
    const body = { service_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', client_email: 'client@example.test', requested_date: '2027-01-01', notes: 'Fictional appointment request' }
    const response = await createBooking(request(body, false))
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ message: 'Booking request submitted.' })
    expect(from).toHaveBeenCalledWith('bookings')
    expect(insert).toHaveBeenCalledWith(body)
  })
  it('booking extra fields and invalid calendar dates are rejected before persistence', async () => {
    const body = { service_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', client_email: 'client@example.test', requested_date: '2027-02-30', notes: 'Fictional appointment request', admin: true }
    expect((await createBooking(request(body, false))).status).toBe(400)
    expect(transport.createClient).not.toHaveBeenCalled()
  })
})
