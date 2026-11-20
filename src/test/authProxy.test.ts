import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { CookieMethodsServer } from '@supabase/ssr'
const mocks = vi.hoisted(() => ({ createSessionClient: vi.fn(), getUser: vi.fn(), getSession: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('../auth/client', () => ({ createSessionClient: mocks.createSessionClient }))
import { proxy, config } from '../proxy'
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }); mocks.createSessionClient.mockReturnValue({ auth: { getUser: mocks.getUser, getSession: mocks.getSession } }) })

describe('Next16 auth refresh Proxy', () => {
  test('matcher leaves all existing bearer-only API routes untouched', () => {
    expect(config.matcher).toEqual(['/realtor-dashboard/:path*', '/login'])
    expect(config.matcher.some(path => path.startsWith('/api'))).toBe(false)
  })
  test('refresh cookies propagate to the request and response with SDK no-store headers', async () => {
    mocks.createSessionClient.mockImplementation((cookies: CookieMethodsServer) => ({ auth: {
      async getUser() {
        await cookies.setAll!([{ name: 'barriolist-auth', value: 'synthetic-refreshed-cookie-only', options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' } }], { 'Cache-Control': 'private, no-store', Expires: '0' })
        return { data: { user: { id: '11111111-1111-4111-8111-111111111111' } }, error: null }
      }, getSession: mocks.getSession,
    } }))
    const request = new NextRequest('https://classroom.example.invalid/realtor-dashboard')
    const response = await proxy(request)
    expect(request.cookies.get('barriolist-auth')?.value).toBe('synthetic-refreshed-cookie-only')
    expect(response.cookies.get('barriolist-auth')?.value).toBe('synthetic-refreshed-cookie-only')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(mocks.getSession).not.toHaveBeenCalled()
  })
  test('unexpected refresh failure does not expose diagnostics or protected content', async () => {
    mocks.getUser.mockRejectedValue(new Error('private diagnostics'))
    const response = await proxy(new NextRequest('https://classroom.example.invalid/realtor-dashboard'))
    expect(await response.text()).toBe('')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(mocks.getSession).not.toHaveBeenCalled()
  })
  test('existing explicit Bearer page requests are verified by the page rather than cookie refresh', async () => {
    await proxy(new NextRequest('https://classroom.example.invalid/realtor-dashboard', { headers: { Authorization: 'Bearer synthetic' } }))
    expect(mocks.createSessionClient).not.toHaveBeenCalled()
  })
})
