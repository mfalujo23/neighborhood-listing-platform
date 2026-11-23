import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ session: vi.fn(), dependencies: vi.fn(), authorize: vi.fn(), enabled: vi.fn(), read: vi.fn() }))
vi.mock('../auth/server', () => ({ createRenderSessionClient: mocks.session }))
vi.mock('../analytics/server', () => ({ createServerAnalyticsDependencies: mocks.dependencies }))
import { filterDashboard } from '../app/realtor-dashboard/actions'
import { aggregateAnalytics } from '../analytics/metrics'
import type { DashboardFilterState } from '../analytics/dashboard-state'

const filter = { from: '2026-11-17', through: '2026-11-18' }
const propertyId = '22222222-2222-4222-8222-222222222222'
const principal = { userId: '11111111-1111-4111-8111-111111111111', role: 'provider' }
const summary = aggregateAnalytics([], filter)
const previous: DashboardFilterState = { summary, filter, error: null }
function form(values: Partial<Record<string, string>> = {}) {
  const result = new FormData()
  Object.entries({ ...filter, propertyId: '', ...values }).forEach(([name, value]) => { if (value !== undefined) result.set(name, value) })
  return result
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.session.mockResolvedValue({ session: 'verified in dependency' })
  mocks.dependencies.mockReturnValue({ authorize: mocks.authorize, enabled: mocks.enabled, read: mocks.read })
  mocks.authorize.mockResolvedValue({ principal })
  mocks.enabled.mockReturnValue(true)
  mocks.read.mockResolvedValue(summary)
})

describe('Session dashboard filtering (SDK and session calls mocked)', () => {
  it('reauthorizes the cookie session and reads only the verified principal and validated filter', async () => {
    const result = await filterDashboard(previous, form({ propertyId: ` ${propertyId} ` }))
    expect(mocks.session).toHaveBeenCalledOnce()
    expect(mocks.dependencies).toHaveBeenCalledWith({ dashboardSessionClient: { session: 'verified in dependency' } })
    expect([...mocks.authorize.mock.calls[0][0].entries()]).toEqual([])
    expect(mocks.read).toHaveBeenCalledWith(principal, { ...filter, propertyId })
    expect(result).toEqual({ summary, filter: { ...filter, propertyId }, error: null })
    expect(JSON.stringify(result)).not.toContain(principal.userId)
  })
  it('leaves a blank property unfiltered within the verified account scope and accepts an empty result', async () => {
    expect(await filterDashboard(previous, form({ propertyId: '  ' }))).toEqual(previous)
    expect(mocks.read).toHaveBeenCalledWith(principal, filter)
  })
  it.each([401, 403, 503])('fails closed for denied access %s without retaining previous results', async denied => {
    mocks.authorize.mockResolvedValue({ denied })
    expect(await filterDashboard(previous, form())).toMatchObject({ summary: null, filter: null, error: expect.any(String) })
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it('checks again after a successful request when the session expires', async () => {
    await filterDashboard(previous, form())
    mocks.authorize.mockResolvedValue({ denied: 401 })
    const result = await filterDashboard(previous, form())
    expect(mocks.session).toHaveBeenCalledTimes(2)
    expect(mocks.authorize).toHaveBeenCalledTimes(2)
    expect(mocks.read).toHaveBeenCalledTimes(1)
    expect(result.summary).toBeNull()
  })
  it('ignores forged previous state instead of treating client state as authority', async () => {
    const forged = { ...previous, principal: { role: 'admin', userId: 'attacker' } }
    await filterDashboard(forged, form())
    expect(mocks.read).toHaveBeenCalledWith(principal, filter)
  })
  it('honors the feature switch after authorization', async () => {
    mocks.enabled.mockReturnValue(false)
    expect((await filterDashboard(previous, form())).summary).toBeNull()
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it.each([
    { from: '2026-02-30' }, { through: 'not-a-date' }, { from: '2026-11-19' }, { propertyId: 'not-a-uuid' },
  ])('rejects invalid filters before reading: %j', async values => {
    const result = await filterDashboard(previous, form(values))
    expect(result).toMatchObject({ summary: null, filter: null, error: expect.any(String) })
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it('rejects duplicate, missing and file fields', async () => {
    const duplicate = form(); duplicate.append('from', '2026-11-16')
    const missing = form(); missing.delete('through')
    const file = form(); file.set('propertyId', new Blob(['not a property']), 'fake.txt')
    for (const data of [duplicate, missing, file]) expect((await filterDashboard(previous, data)).summary).toBeNull()
    expect(mocks.read).not.toHaveBeenCalled()
  })
  it.each(['session', 'authorize', 'read'] as const)('hides backend details and old results when %s fails', async name => {
    mocks[name].mockRejectedValue(new Error('private backend detail'))
    const result = await filterDashboard(previous, form())
    expect(result).toMatchObject({ summary: null, filter: null, error: expect.any(String) })
    expect(JSON.stringify(result)).not.toContain('private backend')
  })
})
