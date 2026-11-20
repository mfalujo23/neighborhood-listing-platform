import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
const mocks = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
import { createServerAnalyticsDependencies } from '../analytics/server'

const userId = '11111111-1111-4111-8111-111111111111'
function session(role: string | null = 'provider') {
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: userId, user_metadata: { role: 'admin' } } }, error: null })
  const getSession = vi.fn().mockResolvedValue({ data: { session: { user: { id: userId, role: 'admin' } } } })
  const single = vi.fn().mockResolvedValue({ data: role ? { role } : null, error: null })
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: single }
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query)
  const from = vi.fn().mockReturnValue(query), rpc = vi.fn()
  const client = { auth: { getUser, getSession }, from, rpc } as unknown as SupabaseClient
  return { client, getUser, getSession, from, rpc, single }
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://project.example.invalid')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_synthetic_fixture_key_only')
})
afterEach(() => vi.unstubAllEnvs())

describe('Separate cookie dashboard authorization preserves bearer API behavior', () => {
  test('ordinary API dependencies still reject a Cookie or claimed role without Bearer', async () => {
    const api = createServerAnalyticsDependencies()
    expect(await api.authorize(new Headers({ Cookie: 'barriolist-auth=synthetic', 'x-role': 'admin' }))).toEqual({ denied: 401 })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
  test.each(['provider', 'admin', 'property_professional'] as const)('verified cookie identity uses protected %s profile, not metadata', async (role) => {
    const value = session(role)
    const access = await createServerAnalyticsDependencies({ dashboardSessionClient: value.client }).authorize(new Headers())
    expect(access).toEqual({ principal: { userId, role } })
    expect(value.getUser).toHaveBeenCalledWith(); expect(value.getSession).not.toHaveBeenCalled()
    expect(value.from).toHaveBeenCalledWith('profiles'); expect(mocks.createClient).not.toHaveBeenCalled()
  })
  test.each(['client', 'merchant', null])('cookie account role %s cannot obtain dashboard access', async (role) => {
    const value = session(role)
    expect(await createServerAnalyticsDependencies({ dashboardSessionClient: value.client }).authorize(new Headers())).toEqual({ denied: 403 })
    expect(value.rpc).not.toHaveBeenCalled()
  })
  test('revoked/expired verified user fails before profile and protected reads', async () => {
    const value = session()
    value.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'revoked' } })
    expect(await createServerAnalyticsDependencies({ dashboardSessionClient: value.client }).authorize(new Headers())).toEqual({ denied: 401 })
    expect(value.from).not.toHaveBeenCalled(); expect(value.rpc).not.toHaveBeenCalled(); expect(value.getSession).not.toHaveBeenCalled()
  })
  test('a malformed explicit Authorization header cannot fall back to a valid cookie', async () => {
    const value = session()
    expect(await createServerAnalyticsDependencies({ dashboardSessionClient: value.client }).authorize(new Headers({ Authorization: 'Basic synthetic' }))).toEqual({ denied: 401 })
    expect(value.getUser).not.toHaveBeenCalled()
  })
  test('an invalid explicit Bearer token takes precedence over a valid cookie', async () => {
    const cookie = session(), bearer = session()
    bearer.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } })
    mocks.createClient.mockReturnValue(bearer.client)
    expect(await createServerAnalyticsDependencies({ dashboardSessionClient: cookie.client }).authorize(new Headers({ Authorization: 'Bearer synthetic-invalid' }))).toEqual({ denied: 401 })
    expect(bearer.getUser).toHaveBeenCalledWith('synthetic-invalid'); expect(cookie.getUser).not.toHaveBeenCalled()
  })
})
