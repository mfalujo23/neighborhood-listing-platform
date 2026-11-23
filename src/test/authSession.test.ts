import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ createServerClient: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }))
import { createSessionClient } from '../auth/client'
import { authConfiguration, AUTH_COOKIE_NAME, isAuthCookie } from '../auth/config'
import type { CookieMethodsServer, CookieOptions } from '@supabase/ssr'

const env = { NODE_ENV: 'production', SUPABASE_URL: 'https://project.example.invalid', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_fixture_key_only' } as const
beforeEach(() => { vi.clearAllMocks(); mocks.createServerClient.mockReturnValue({ auth: {} }) })
afterEach(() => vi.unstubAllEnvs())

describe('Official SSR cookie configuration boundaries', () => {
  test('private server key and service-role JWT configuration never construct a client', () => {
    const serviceJwt = ['synthetic', Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url'), 'synthetic'].join('.')
    for (const key of ['sb_secret_synthetic_fixture_key_only', serviceJwt, 'invalid']) {
      expect(() => createSessionClient({ getAll: () => [], setAll() {} }, { ...env, SUPABASE_PUBLISHABLE_KEY: key })).toThrow('unavailable')
    }
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })
  test.each(['http://public.example.invalid', 'https://project.example.invalid/?key=x', 'https://user:password@project.example.invalid', 'https://project.example.invalid/path'])('unsafe endpoint %s fails closed', (url) => {
    expect(() => authConfiguration({ ...env, SUPABASE_URL: url })).toThrow('unavailable')
  })
  test('loopback HTTP requires the explicit fictional-preview flag', () => {
    expect(() => authConfiguration({ ...env, SUPABASE_URL: 'http://127.0.0.1:54325' })).toThrow()
    const configuration = authConfiguration({ ...env, SUPABASE_URL: 'http://127.0.0.1:54325', MIDTERM_LOCAL_FIXTURE_PREVIEW: 'true' })
    expect(configuration.cookieOptions.secure).toBe(false)
    expect(() => authConfiguration({ ...env, SUPABASE_URL: 'http://public.example.invalid', MIDTERM_LOCAL_FIXTURE_PREVIEW: 'true' })).toThrow()
  })
  test('cookies are server-only and scoped; SDK deletion and cache headers survive the adapter', async () => {
    const setAll = vi.fn(), getAll = () => [{ name: AUTH_COOKIE_NAME, value: 'synthetic-cookie-only' }]
    createSessionClient({ getAll, setAll }, env)
    const options = mocks.createServerClient.mock.calls[0][2] as { cookieOptions: CookieOptions & { name: string }; cookies: CookieMethodsServer }
    expect(options.cookieOptions).toMatchObject({ name: AUTH_COOKIE_NAME, httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 604800 })
    expect(options.cookies.encode).toBe('tokens-only')
    expect(await options.cookies.getAll()).toEqual(getAll())
    await options.cookies.setAll!([{ name: AUTH_COOKIE_NAME, value: '', options: { maxAge: 0, httpOnly: false, secure: false } }], { 'Cache-Control': 'no-store' })
    expect(setAll).toHaveBeenCalledWith([{ name: AUTH_COOKIE_NAME, value: '', options: { maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax', path: '/' } }], { 'Cache-Control': 'no-store' })
  })
  test('each request receives its own SDK client and only app-owned cookie chunks are clearable', () => {
    createSessionClient({ getAll: () => [], setAll() {} }, env)
    createSessionClient({ getAll: () => [], setAll() {} }, env)
    expect(mocks.createServerClient).toHaveBeenCalledTimes(2)
    expect(isAuthCookie(AUTH_COOKIE_NAME)).toBe(true)
    expect(isAuthCookie(AUTH_COOKIE_NAME+'.0')).toBe(true)
    expect(isAuthCookie(AUTH_COOKIE_NAME+'-other')).toBe(false)
    expect(isAuthCookie('unrelated-cookie')).toBe(false)
  })
})
