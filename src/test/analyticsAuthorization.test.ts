import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getAdmin: vi.fn(), getUser: vi.fn(), from: vi.fn(), rpc: vi.fn(), profileSingle: vi.fn(), propertySingle: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('../lib/supabase-server', () => ({ getSupabaseAdmin: mocks.getAdmin }))
import { createServerAnalyticsDependencies } from '../analytics/server'
import { fictionalAnalyticsEvents } from '../analytics/fixtures'
import { eventToColumns } from '../analytics/rows'

const userId = '11111111-1111-4111-8111-111111111111'
const headers = new Headers({ Authorization: 'Bearer synthetic-local-token' })
function builder(single: typeof mocks.profileSingle) {
  const value = { select: vi.fn(), eq: vi.fn(), maybeSingle: single }
  value.select.mockReturnValue(value); value.eq.mockReturnValue(value)
  return value
}
beforeEach(() => {
  vi.clearAllMocks()
  for (const [key, value] of Object.entries({ SUPABASE_URL: 'https://synthetic.invalid', SUPABASE_ANON_KEY: 'synthetic-no-secret', ENABLE_ANALYTICS: 'true', ANALYTICS_FIXTURE_MODE: 'true' })) vi.stubEnv(key, value)
  mocks.getUser.mockResolvedValue({ data: { user: { id: userId, user_metadata: { role: 'admin' } } }, error: null })
  mocks.profileSingle.mockResolvedValue({ data: { role: 'provider' }, error: null })
  mocks.propertySingle.mockResolvedValue({ data: null, error: null })
  mocks.from.mockImplementation((table: string) => builder(table === 'profiles' ? mocks.profileSingle : mocks.propertySingle))
  mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser }, from: mocks.from, rpc: mocks.rpc })
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('Server-verified dashboard authorization (all SDK calls mocked)', () => {
  test('anonymous and claimed client-role headers never create a backend client', async () => {
    expect(await createServerAnalyticsDependencies().authorize(new Headers({ 'x-role': 'admin' }))).toEqual({ denied: 401 })
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.getAdmin).not.toHaveBeenCalled()
  })
  test('an invalid token fails before profile or event reads', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } })
    expect(await createServerAnalyticsDependencies().authorize(headers)).toEqual({ denied: 401 })
    expect(mocks.from).not.toHaveBeenCalled()
  })
  test('user-controlled metadata cannot grant the administrator role', async () => {
    mocks.profileSingle.mockResolvedValue({ data: { role: 'client' }, error: null })
    expect(await createServerAnalyticsDependencies().authorize(headers)).toEqual({ denied: 403 })
  })
  test.each(['provider', 'admin'] as const)('protected profile role %s is accepted only after getUser', async (role) => {
    mocks.profileSingle.mockResolvedValue({ data: { role }, error: null })
    expect(await createServerAnalyticsDependencies().authorize(headers)).toEqual({ principal: { userId, role } })
    expect(mocks.getUser).toHaveBeenCalledWith('synthetic-local-token')
  })
  test('feature flag is false without the exact opt-in value', () => {
    vi.stubEnv('ENABLE_ANALYTICS', '')
    expect(createServerAnalyticsDependencies().enabled()).toBe(false)
    vi.stubEnv('ENABLE_ANALYTICS', '1')
    expect(createServerAnalyticsDependencies().enabled()).toBe(false)
  })
  test('read cannot run before verified authorization', async () => {
    await expect(createServerAnalyticsDependencies().read({ userId, role: 'admin' }, { from: '2026-11-17', through: '2026-11-18' })).rejects.toThrow('Access unavailable')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  test('server reader returns aggregates only and confirms the SQL CTR counts', async () => {
    const deps = createServerAnalyticsDependencies()
    await deps.authorize(headers)
    mocks.rpc.mockResolvedValue({ data: { truncated: false, events: fictionalAnalyticsEvents().map(eventToColumns), sponsorCtr: [{ neighborhood: '90032', impression_count: 4, clicked_impressions: 2, ctr_percent: '50' }] }, error: null })
    const summary = await deps.read({ userId, role: 'provider' }, { from: '2026-11-17', through: '2026-11-18' })
    expect(summary.metrics.sponsorCtr.percent).toBe(50)
    expect(summary).not.toHaveProperty('events')
    expect(JSON.stringify(summary)).not.toContain('correlation_id')
    expect(mocks.rpc).toHaveBeenCalledWith('analytics_event_window', { p_from: '2026-11-17T00:00:00.000Z', p_end_exclusive: '2026-11-19T00:00:00.000Z', p_property_id: null, p_source: 'fixture' })
  })
  test('truncated windows are rejected rather than reported as complete counts', async () => {
    const deps = createServerAnalyticsDependencies(); await deps.authorize(headers)
    mocks.rpc.mockResolvedValue({ data: { truncated: true, events: [], sponsorCtr: [] }, error: null })
    await expect(deps.read({ userId, role: 'provider' }, { from: '2026-11-17', through: '2026-11-18' })).rejects.toThrow('capacity')
  })
  test('other-property fixture writes fail before administrator access', async () => {
    const deps = createServerAnalyticsDependencies(); await deps.authorize(headers)
    expect(await deps.write({ userId, role: 'provider' }, fictionalAnalyticsEvents()[0])).toBe('forbidden')
    expect(mocks.getAdmin).not.toHaveBeenCalled()
  })
  test('internal principal arguments cannot elevate a verified provider role', async () => {
    const deps = createServerAnalyticsDependencies(); await deps.authorize(headers)
    expect(await deps.write({ userId, role: 'admin' }, fictionalAnalyticsEvents()[0])).toBe('forbidden')
    expect(mocks.getAdmin).not.toHaveBeenCalled()
  })
  test('failed reauthorization clears any earlier verified identity', async () => {
    const deps = createServerAnalyticsDependencies(); await deps.authorize(headers)
    expect(await deps.authorize(new Headers())).toEqual({ denied: 401 })
    await expect(deps.read({ userId, role: 'provider' }, { from: '2026-11-17', through: '2026-11-18' })).rejects.toThrow('Access unavailable')
  })
  test('protected legacy profile can read but cannot invoke fixture writes', async () => {
    mocks.profileSingle.mockResolvedValue({data:{role:'property_professional'},error:null})
    const deps=createServerAnalyticsDependencies()
    expect(await deps.authorize(headers)).toEqual({principal:{userId,role:'property_professional'}})
    mocks.rpc.mockResolvedValue({data:{truncated:false,events:fictionalAnalyticsEvents().map(eventToColumns),sponsorCtr:[{neighborhood:'90032',impression_count:4,clicked_impressions:2,ctr_percent:'50'}]},error:null})
    expect((await deps.read({userId,role:'property_professional'},{from:'2026-11-17',through:'2026-11-18'})).eventCount).toBe(30)
    mocks.propertySingle.mockResolvedValue({data:{id:fictionalAnalyticsEvents()[0].propertyId},error:null})
    expect(await deps.write({userId,role:'property_professional'},fictionalAnalyticsEvents()[0])).toBe('forbidden')
    expect(mocks.propertySingle).not.toHaveBeenCalled()
    expect(mocks.getAdmin).not.toHaveBeenCalled()
  })
  test.each(['merchant','client'])('canonical role %s is denied before event access',async role=>{
    mocks.profileSingle.mockResolvedValue({data:{role},error:null})
    expect(await createServerAnalyticsDependencies().authorize(headers)).toEqual({denied:403})
    expect(mocks.rpc).not.toHaveBeenCalled();expect(mocks.getAdmin).not.toHaveBeenCalled()
  })
  test('canonical provider fixture write requires verified ownership before privileged insert',async()=>{
    const deps=createServerAnalyticsDependencies();await deps.authorize(headers)
    mocks.propertySingle.mockResolvedValue({data:{id:fictionalAnalyticsEvents()[0].propertyId},error:null})
    const insert=vi.fn().mockResolvedValue({error:null})
    mocks.getAdmin.mockReturnValueOnce({from:vi.fn().mockReturnValue({insert})})
    expect(await deps.write({userId,role:'provider'},fictionalAnalyticsEvents()[0])).toBe('accepted')
    expect(insert).toHaveBeenCalledOnce()
    expect(insert.mock.calls[0][0]).toMatchObject({source:'fixture',event_name:'listing_view'})
  })
})
