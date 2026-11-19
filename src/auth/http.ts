import 'server-only'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createRequestBudget, JsonBodyError, readJsonBody } from '../lib/request-controls'
import { AUTH_CACHE_HEADERS } from './config'

const SignInSchema = z.object({
  email: z.string().trim().max(254).pipe(z.email()),
  password: z.string().min(1).max(1024),
}).strict()
export type RouteSession = {
  client: SupabaseClient
  clear: () => void
  response: (response: Response) => Response
}
type Budget = ReturnType<typeof createRequestBudget>
export const signInBudget = createRequestBudget(20, 60_000)
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: AUTH_CACHE_HEADERS })
export function authMethodNotAllowed() {
  return new Response('Method Not Allowed', { status: 405, headers: { ...AUTH_CACHE_HEADERS, Allow: 'POST' } })
}
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const site = request.headers.get('sec-fetch-site')
  if (!origin || origin === 'null' || site === 'cross-site') return false
  try {
    const url = new URL(request.url)
    // Next's internal request URL can use localhost while the browser's
    // authority is retained in Host. Never trust X-Forwarded-Host overrides.
    const host = request.headers.get('host') ?? url.host
    const forwardedProtocol = request.headers.get('x-forwarded-proto')
    if (forwardedProtocol && !['http', 'https'].includes(forwardedProtocol)) return false
    const target = new URL(`${forwardedProtocol ?? url.protocol.slice(0, -1)}://${host}`)
    if (target.username || target.password || target.pathname !== '/' || target.search || target.hash) return false
    return new URL(origin).origin === origin && origin === target.origin
  }
  catch { return false }
}
export function createAuthHandlers(getSession: () => Promise<RouteSession>, budget: Budget = signInBudget) {
  return {
    async signIn(request: Request) {
      if (request.method !== 'POST') return authMethodNotAllowed()
      if (!isSameOrigin(request)) return json({ error: 'This sign-in request is not allowed.' }, 403)
      let input: unknown
      try { input = await readJsonBody(request, 4096) }
      catch (error) { return json({ error: 'Enter your email and password.' }, error instanceof JsonBodyError ? error.status : 400) }
      const parsed = SignInSchema.safeParse(input)
      if (!parsed.success) return json({ error: 'Enter your email and password.' }, 400)
      const capacity = budget.take()
      if (!capacity.allowed) {
        const response = json({ error: 'Too many sign-in attempts. Try again shortly.' }, 429)
        response.headers.set('Retry-After', String(capacity.retryAfter)); return response
      }
      let session: RouteSession | null = null
      try {
        session = await getSession()
        const signed = await session.client.auth.signInWithPassword(parsed.data)
        if (signed.error) {
          const unavailable = !signed.error.status || signed.error.status >= 500
          return session.response(json({ error: unavailable ? 'Sign-in is temporarily unavailable. Try again shortly.' : 'Email or password was not accepted.' }, unavailable ? 503 : 401))
        }
        // A returned session/getSession user is not an authorization decision.
        const verified = await session.client.auth.getUser()
        if (verified.error || !verified.data.user) {
          session.clear()
          return session.response(json({ error: 'Sign-in could not be verified. Try again.' }, 401))
        }
        return session.response(json({ ok: true }))
      } catch {
        session?.clear()
        const response = json({ error: 'Sign-in is temporarily unavailable. Try again shortly.' }, 503)
        return session ? session.response(response) : response
      }
    },
    async signOut(request: Request) {
      if (request.method !== 'POST') return authMethodNotAllowed()
      if (!isSameOrigin(request)) return json({ error: 'This sign-out request is not allowed.' }, 403)
      let session: RouteSession | null = null
      try {
        session = await getSession()
        const result = await session.client.auth.signOut({ scope: 'local' })
        session.clear()
        if (result.error && result.error.name !== 'AuthSessionMissingError') {
          return session.response(json({ error: 'The local session was cleared. Try signing out again if needed.' }, 503))
        }
        return session.response(json({ ok: true }))
      } catch {
        session?.clear()
        return session ? session.response(json({ error: 'The local session was cleared. Try again shortly.' }, 503)) : json({ error: 'Sign-out is temporarily unavailable.' }, 503)
      }
    },
  }
}
