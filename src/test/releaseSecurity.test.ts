import { afterEach, describe, expect, it, vi } from 'vitest'
const transport = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@supabase/supabase-js', () => ({ createClient: transport.createClient }))
import { GET as health, HEAD as healthHead } from '../app/api/health/route'
import { GET as legacyGet, POST as legacyPost } from '../app/api/webhooks/twilio/route'
import { getSupabaseAdmin } from '../lib/supabase-server'
import { baselineCsp, securityHeaders } from '../../config/security-headers.mjs'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks() })
describe('Release safety boundaries', () => {
  it('returns explicit application liveness without claiming database/provider readiness', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-private-sentinel')
    const response = health()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const data = await response.json()
    expect(data.level).toBe('liveness')
    expect(data.checks).toEqual({ application: 'running', database: 'not_checked', voice_provider: 'not_checked' })
    expect(JSON.stringify(data)).not.toContain('synthetic-private-sentinel')
    expect(data.commit).toBe('f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5')
  })
  it('does not reflect arbitrary environment strings through health output', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'untrusted-value')
    expect((await health().json()).commit).toBe('local')
    expect(await healthHead().text()).toBe('')
  })
  it.each([['GET', legacyGet], ['POST', legacyPost]] as const)('retires legacy%s without parsing, logging or provider calls', async (_method, handler) => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const response = handler()
    expect(response.status).toBe(410)
    expect(await response.json()).toEqual({ error: 'LEGACY_WEBHOOK_RETIRED' })
    expect(response.headers.get('link')).toContain('/api/webhooks/voice')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects a known public-key type in the privileged environment variable', () => {
    vi.stubEnv('SUPABASE_URL', 'https://synthetic.invalid')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_publishable_synthetic_not_a_real_key')
    expect(() => getSupabaseAdmin()).toThrow('requires a server secret key')
    expect(transport.createClient).not.toHaveBeenCalled()
  })
  it('sets explicit framing, MIME, referrer and permission controls', () => {
    const headers = Object.fromEntries(securityHeaders().map(({ key, value }) => [key.toLowerCase(), value]))
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('no-referrer')
    expect(headers['permissions-policy']).toContain('microphone=()')
    expect(headers['content-security-policy']).toBe(baselineCsp)
    expect(baselineCsp).not.toContain('unsafe-inline')
    expect(baselineCsp).not.toContain('unsafe-eval')
  })
  it('uses HSTS only in production configuration', () => {
    expect(securityHeaders().some(({ key }) => key === 'Strict-Transport-Security')).toBe(false)
    expect(securityHeaders(true).find(({ key }) => key === 'Strict-Transport-Security')?.value).toBe('max-age=31536000')
  })
})
