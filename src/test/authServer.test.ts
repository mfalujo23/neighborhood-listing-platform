import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { CookieMethodsServer } from '@supabase/ssr'
const mocks = vi.hoisted(() => ({ cookies: vi.fn(), createSessionClient: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('../auth/client', () => ({ createSessionClient: mocks.createSessionClient }))
import { createRenderSessionClient, createRouteSession } from '../auth/server'

const set = vi.fn(), getAll = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('SUPABASE_URL', 'https://project.example.invalid')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_synthetic_fixture_key_only')
  getAll.mockReturnValue([{ name: 'barriolist-auth.0', value: 'synthetic-only' }, { name: 'unrelated-cookie', value: 'unchanged' }])
  mocks.cookies.mockResolvedValue({ getAll, set })
  mocks.createSessionClient.mockReturnValue({ auth: {} })
})
afterEach(() => vi.unstubAllEnvs())
describe('Server-only Next cookie bridge', () => {
  test('logout tombstones retain secure flags and never clear unrelated cookies', async () => {
    const session = await createRouteSession(); session.clear()
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith('barriolist-auth.0', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0, expires: new Date(0) })
  })
  test('SDK cookie updates and required anti-cache headers reach a route response', async () => {
    const session = await createRouteSession()
    const adapter = mocks.createSessionClient.mock.calls[0][0] as CookieMethodsServer
    await adapter.setAll!([{ name: 'barriolist-auth', value: 'synthetic-only', options: { httpOnly: true } }], { 'Cache-Control': 'private, no-store', Expires: '0' })
    const response = session.response(Response.json({ ok: true }))
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('expires')).toBe('0')
    expect(await adapter.getAll()).toEqual(getAll())
  })
  test('render client does not attempt cookie mutation; Proxy owns refresh writes', async () => {
    await createRenderSessionClient()
    const adapter = mocks.createSessionClient.mock.calls[0][0] as CookieMethodsServer
    await adapter.setAll!([{ name: 'barriolist-auth', value: 'synthetic-only', options: {} }], {})
    expect(set).not.toHaveBeenCalled()
  })
})
