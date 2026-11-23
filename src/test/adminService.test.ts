import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const transport = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: transport.createClient }))
vi.mock('server-only', () => ({}))
import { PATCH } from '../app/api/admin/services/route'

const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
function setup(role = 'admin', validSession = true) {
  const adminChain = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id, status: 'suspended' }, error: null }) }
  const profile = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { role }, error: null }) }
  const user = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: validSession ? { id: '33333333-3333-4333-8333-333333333333' } : null }, error: null }) }, from: vi.fn().mockReturnValue(profile) }
  transport.createClient.mockImplementation((_url, key) => key === 'synthetic-admin-key' ? { from: vi.fn().mockReturnValue(adminChain) } : user)
  return adminChain
}
const request = (body: unknown, auth = true) => new Request('http://local.test/api/admin/services', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer synthetic-session' } : {}) }, body: JSON.stringify(body) })
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://synthetic.invalid')
  vi.stubEnv('SUPABASE_ANON_KEY', 'synthetic-public-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-admin-key')
})
afterEach(() => vi.unstubAllEnvs())
describe('Administrator service approval and suspension', () => {
  it('requires sign-in before constructing a client', async () => {
    expect((await PATCH(request({ service_id: id }, false))).status).toBe(401)
    expect(transport.createClient).not.toHaveBeenCalled()
  })
  it('rejects an unverified session before privileged execution', async () => {
    setup('admin', false)
    expect((await PATCH(request({ service_id: id }))).status).toBe(401)
    expect(transport.createClient).toHaveBeenCalledTimes(1)
  })
  it('does not elevate a provider profile', async () => {
    setup('provider')
    expect((await PATCH(request({ service_id: id, status: 'approved' }))).status).toBe(403)
    expect(transport.createClient).toHaveBeenCalledTimes(1)
  })
  it.each([{ service_id: 'invalid' }, { service_id: id, status: 'draft' }, { service_id: id, unexpected: true }])('rejects invalid administrator update%j', async (payload) => {
    setup()
    expect((await PATCH(request(payload))).status).toBe(400)
    expect(transport.createClient).toHaveBeenCalledTimes(1)
  })
  it.each(['approved', 'suspended'] as const)('allows a verified administrator to set%s', async (status) => {
    const chain = setup()
    expect((await PATCH(request({ service_id: id, status }))).status).toBe(200)
    expect(chain.update).toHaveBeenCalledWith({ status })
    expect(chain.eq).toHaveBeenCalledWith('id', id)
    expect(transport.createClient).toHaveBeenCalledTimes(2)
  })
})
