import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn(), getAdmin: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))
vi.mock('../lib/supabase-server', () => ({ getSupabaseAdmin: mocks.getAdmin }))
import { getActiveSponsorForProperty } from '../actions/get-sponsor'
import { recordSponsorImpression } from '../actions/record-sponsor-impression'

const propertyId = '60000000-0000-4000-8000-000000000001'
const sponsorId = '60000000-0000-4000-8000-00000000000c'
const row = {
  id: sponsorId, business_name: 'Fictional Sponsor C', destination_url: 'https://example.com/c',
  status: 'APPROVED', is_active: true, placement: 'sidebar', start_date: '2026-10-01', end_date: '2026-10-31',
  target_zip_codes: ['90032'], coverage_radius_miles: '5.00', tier: 'Gold', impression_count: 90, distance_miles: '0.80',
}
const clock = () => new Date('2026-10-24T12:00:00Z')
beforeEach(() => {
  vi.clearAllMocks()
  mocks.createClient.mockReturnValue({ rpc: mocks.rpc })
  mocks.getAdmin.mockReturnValue({ rpc: mocks.rpc })
  mocks.rpc.mockResolvedValue({ data: [row], error: null })
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.invalid')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic-not-a-secret')
  vi.stubEnv('ENABLE_SPONSOR_IMPRESSIONS', '')
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('Public sponsor RPC wiring (fully mocked, no database/network)', () => {
  test('queries narrow property context and returns only public card fields', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...row, internal_notes: 'private field must not escape' }], error: null })
    expect(await getActiveSponsorForProperty(propertyId, '90032', 'sidebar', clock)).toEqual({ id: sponsorId, business_name: row.business_name, destination_url: row.destination_url })
    expect(mocks.rpc).toHaveBeenCalledWith('eligible_sponsors_for_property', { p_property_id: propertyId, p_zip: '90032', p_placement: 'sidebar' })
  })
  test('never invents a distance for missing database data', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...row, distance_miles: null }], error: null })
    expect(await getActiveSponsorForProperty(propertyId, '90032', 'sidebar', clock)).toBeNull()
  })
  test('rejects a URL that becomes unsafe after database approval', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...row, destination_url: 'https://127.0.0.1/' }], error: null })
    expect(await getActiveSponsorForProperty(propertyId, '90032', 'sidebar', clock)).toBeNull()
  })
  test('accepts bounded legacy text sponsor IDs without rewriting records', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...row, id: 'legacy-sponsor-c' }], error: null })
    expect((await getActiveSponsorForProperty(propertyId, '90032', 'sidebar', clock))?.id).toBe('legacy-sponsor-c')
  })
  test('invalid property context is rejected before a client is created', async () => {
    expect(await getActiveSponsorForProperty('not-uuid', '90032', 'sidebar', clock)).toBeNull()
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
  test('backend details are absent from logs and the safe fallback result', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'private backend details' } })
    expect(await getActiveSponsorForProperty(propertyId, '90032', 'sidebar', clock)).toBeNull()
    expect(log).toHaveBeenCalledWith('Sponsor eligibility query unavailable.')
  })
})

describe('Opt-in coarse impression boundary (mocked backend)', () => {
  const input = { sponsorId, placement: 'sidebar', pageContext: 'home' }
  test('default-off rendering never creates an administrator client', async () => {
    await recordSponsorImpression(input)
    expect(mocks.getAdmin).not.toHaveBeenCalled()
  })
  test('explicit opt-in sends only ID, placement and coarse page context', async () => {
    vi.stubEnv('ENABLE_SPONSOR_IMPRESSIONS', 'true')
    await recordSponsorImpression(input)
    expect(mocks.rpc).toHaveBeenCalledWith('record_sponsor_placement_impression', { p_sponsor_id: sponsorId, p_placement: 'sidebar', p_page_context: 'home' })
  })
  test('PII-shaped extra fields are rejected before any backend call', async () => {
    vi.stubEnv('ENABLE_SPONSOR_IMPRESSIONS', 'true')
    await recordSponsorImpression({ ...input, ip: '192.0.2.1' })
    expect(mocks.getAdmin).not.toHaveBeenCalled()
  })
})
