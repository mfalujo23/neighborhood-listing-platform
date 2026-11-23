import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
vi.mock('server-only', () => ({}))
import { createAuthHandlers, isSameOrigin, type RouteSession } from '../auth/http'
import { createRequestBudget } from '../lib/request-controls'

const origin = 'https://classroom.example.invalid'
const password = 'fictional-fixture-password-only'
const credentials = { email: 'provider@example.invalid', password }
const signInWithPassword = vi.fn(), getUser = vi.fn(), signOut = vi.fn(), getSession = vi.fn()
const clear = vi.fn(), getContext = vi.fn()
const user = { id: '11111111-1111-4111-8111-111111111111' }
function req(body: unknown = credentials, overrides: { origin?: string | null; type?: string; method?: string; raw?: string; site?: string } = {}) {
  const headers = new Headers({ 'Content-Type': overrides.type ?? 'application/json' })
  if (overrides.origin !== null) headers.set('Origin', overrides.origin ?? origin)
  if (overrides.site) headers.set('Sec-Fetch-Site', overrides.site)
  const method = overrides.method ?? 'POST'
  return new Request(origin+'/api/auth/sign-in', { method, headers, ...(method === 'GET' ? {} : { body: overrides.raw ?? JSON.stringify(body) }) })
}
function handlers(limit = 20) { return createAuthHandlers(getContext, createRequestBudget(limit)) }
beforeEach(() => {
  vi.clearAllMocks()
  signInWithPassword.mockResolvedValue({ data: { user, session: { access_token: 'fictional-do-not-return', refresh_token: 'fictional-do-not-return-refresh' } }, error: null })
  getUser.mockResolvedValue({ data: { user }, error: null })
  signOut.mockResolvedValue({ error: null })
  const context: RouteSession = { client: { auth: { signInWithPassword, getUser, signOut, getSession } } as unknown as SupabaseClient, clear, response: response => response }
  getContext.mockResolvedValue(context)
})

describe('Sign-in and sign-out trusted boundaries (SDK mocked)', () => {
  test.each([null, 'null', 'https://other.example.invalid', 'https://classroom.example.invalid/'])('rejects missing/cross-origin/noncanonical origin %s before SDK', async (value) => {
    expect((await handlers().signIn(req(credentials, { origin: value }))).status).toBe(403)
    expect(getContext).not.toHaveBeenCalled()
  })
  test('cross-site metadata is denied even with a matching Origin value', async () => {
    expect(isSameOrigin(req(credentials, { site: 'cross-site' }))).toBe(false)
    expect((await handlers().signOut(req(credentials, { site: 'cross-site' }))).status).toBe(403)
    expect(getContext).not.toHaveBeenCalled()
  })
  test('the real browser Host is checked when Next has a canonical internal localhost URL', () => {
    expect(isSameOrigin(new Request('http://localhost:3000/api/auth/sign-in', { method: 'POST', headers: { Origin: 'http://127.0.0.1:3000', Host: '127.0.0.1:3000', 'X-Forwarded-Proto': 'http' } }))).toBe(true)
  })
  test('a forged forwarded host or ambiguous protocol cannot authorize another origin', () => {
    expect(isSameOrigin(new Request(origin+'/api/auth/sign-in', { method: 'POST', headers: { Origin: 'https://other.example.invalid', Host: 'classroom.example.invalid', 'X-Forwarded-Host': 'other.example.invalid' } }))).toBe(false)
    expect(isSameOrigin(new Request(origin+'/api/auth/sign-in', { method: 'POST', headers: { Origin: origin, Host: 'classroom.example.invalid', 'X-Forwarded-Proto': 'https,http' } }))).toBe(false)
  })
  test('same-origin sign-in returns no password, session, token or user object', async () => {
    const response = await handlers().signIn(req())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(getUser).toHaveBeenCalledWith()
    expect(getSession).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('vary')).toBe('Cookie')
  })
  test('trims only email and keeps password bytes unchanged', async () => {
    await handlers().signIn(req({ email: '  provider@example.invalid ', password: ' '+password+' ' }))
    expect(signInWithPassword).toHaveBeenCalledWith({ email: credentials.email, password: ' '+password+' ' })
  })
  test.each([{ ...credentials, role: 'admin' }, { ...credentials, email: 'bad' }, { email: credentials.email }, { ...credentials, password: '' }])('strict invalid credentials stop before SDK', async (body) => {
    expect((await handlers().signIn(req(body))).status).toBe(400)
    expect(signInWithPassword).not.toHaveBeenCalled()
  })
  test('oversize streamed body is rejected before parsing or SDK', async () => {
    expect((await handlers().signIn(req({}, { raw: 'x'.repeat(4097) }))).status).toBe(413)
    expect(getContext).not.toHaveBeenCalled()
  })
  test('malformed JSON and unsupported type fail safely', async () => {
    expect((await handlers().signIn(req({}, { raw: '{' }))).status).toBe(400)
    expect((await handlers().signIn(req({}, { type: 'text/plain' }))).status).toBe(415)
    expect(getContext).not.toHaveBeenCalled()
  })
  test('credential failure does not expose the provider error or attempt profile authorization', async () => {
    signInWithPassword.mockResolvedValue({ error: { status: 400, message: 'private upstream diagnostics' } })
    const response = await handlers().signIn(req())
    expect(response.status).toBe(401)
    expect(await response.text()).not.toContain('private upstream')
    expect(getUser).not.toHaveBeenCalled()
  })
  test('provider outage is unavailable rather than incorrect-password evidence', async () => {
    signInWithPassword.mockResolvedValue({ error: { status: 503, message: 'private upstream diagnostics' } })
    const response = await handlers().signIn(req())
    expect(response.status).toBe(503)
    expect(await response.text()).toContain('temporarily unavailable')
  })
  test('forged getSession user cannot establish a sign-in when getUser rejects it', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { ...user, role: 'admin' } } }, error: null })
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'revoked' } })
    expect((await handlers().signIn(req())).status).toBe(401)
    expect(clear).toHaveBeenCalledOnce()
    expect(getSession).not.toHaveBeenCalled()
  })
  test('unexpected auth failure clears local session and returns only a coarse error', async () => {
    getUser.mockRejectedValue(new Error('sensitive diagnostics'))
    const response = await handlers().signIn(req())
    expect(response.status).toBe(503); expect(clear).toHaveBeenCalled()
    expect(await response.text()).not.toContain('sensitive')
  })
  test('capacity stops another SDK request and has a positive Retry-After', async () => {
    const api = handlers(1)
    expect((await api.signIn(req())).status).toBe(200)
    const response = await api.signIn(req())
    expect(response.status).toBe(429); expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(signInWithPassword).toHaveBeenCalledTimes(1)
  })
  test('sign out requires POST and same origin, clears application cookies and uses local scope', async () => {
    const api = handlers()
    expect((await api.signOut(req({}, { method: 'GET' }))).status).toBe(405)
    expect((await api.signOut(req({}, { origin: null }))).status).toBe(403)
    expect(signOut).not.toHaveBeenCalled()
    expect((await api.signOut(req({}))).status).toBe(200)
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' }); expect(clear).toHaveBeenCalledOnce()
  })
  test('logout upstream failure still removes the local cookie and is not claimed as verified revocation', async () => {
    signOut.mockResolvedValue({ error: { name: 'AuthRetryableFetchError' } })
    expect((await handlers().signOut(req({}))).status).toBe(503)
    expect(clear).toHaveBeenCalledOnce()
  })
  test('missing configuration returns503 without credential echo', async () => {
    getContext.mockRejectedValue(new Error('private configuration detail'))
    const response = await handlers().signIn(req())
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain(password)
  })
})
