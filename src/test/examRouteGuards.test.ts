import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const transport = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: transport.createClient }))
vi.mock('server-only', () => ({}))
import { PATCH as updateService } from '../app/api/admin/services/route'
import { GET as listBookings } from '../app/api/admin/bookings/route'
import { getSupabaseAdmin } from '../lib/supabase-server'

const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
function fixture(profileError: { code: string } | null = null) {
  const profile = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: profileError ? null : { role: 'admin' }, error: profileError }) }
  const publicClient = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: '33333333-3333-4333-8333-333333333333' } }, error: null }) }, from: vi.fn().mockReturnValue(profile) }
  transport.createClient.mockReturnValue(publicClient)
  return profile
}
const request = (body = JSON.stringify({ service_id: id, status: 'approved' }), headers: Record<string, string> = {}) => new Request('http://local.test/api/admin/services', { method: 'PATCH', headers: { Authorization: 'Bearer fictional-session', 'Content-Type': 'application/json', ...headers }, body })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://synthetic.invalid')
  vi.stubEnv('SUPABASE_ANON_KEY', 'synthetic-public-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-server-key')
})
afterEach(() => vi.unstubAllEnvs())

describe('Exam-only administrator and configuration boundaries', () => {
  it.each([['42501', 403], ['08006', 503], ['PGRST000', 503]] as const)('keeps profile failure%s distinct from role denial on both administrator routes', async (code, status) => {
    fixture({ code })
    const responses = [await updateService(request()), await listBookings(new Request('http://local.test/api/admin/bookings', { headers: { Authorization: 'Bearer fictional-session' } }))]
    for (const response of responses) {
      expect(response.status).toBe(status)
      expect(await response.json()).toEqual({ error: 'Account authorization is temporarily unavailable.' })
    }
    expect(transport.createClient).toHaveBeenCalledTimes(2)
    expect(transport.createClient.mock.calls.every(call => call[1] === 'synthetic-public-key')).toBe(true)
  })
  it.each([
    ['unsupported media type', '{}', { 'Content-Type': 'text/plain' }, 415],
    ['declared oversized body', '{}', { 'Content-Length': '20000' }, 413],
    ['actual oversized body', JSON.stringify({ notes: 'x'.repeat(17000) }), {}, 413],
    ['invalid JSON', '{bad', {}, 400],
  ] as const)('rejects%s after verification without constructing the privileged client', async (_label, body, headers, status) => {
    fixture()
    expect((await updateService(request(body, headers))).status).toBe(status)
    expect(transport.createClient).toHaveBeenCalledTimes(1)
  })
  it('rejects a publishable key placed in the privileged slot before client construction', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_publishable_fictional_not_a_real_key')
    expect(() => getSupabaseAdmin()).toThrow('requires a server secret key')
    expect(transport.createClient).not.toHaveBeenCalled()
  })
  it('preserves supported secret-key configuration without reading credentials during import', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_fictional_not_a_real_key')
    getSupabaseAdmin()
    expect(transport.createClient).toHaveBeenCalledWith('https://synthetic.invalid', 'sb_secret_fictional_not_a_real_key', { auth: { persistSession: false, autoRefreshToken: false } })
  })
})
