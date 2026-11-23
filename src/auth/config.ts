import 'server-only'
import type { CookieOptions } from '@supabase/ssr'

export const AUTH_COOKIE_NAME = 'barriolist-auth'
export const AUTH_CACHE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  Pragma: 'no-cache', Expires: '0', Vary: 'Cookie',
}

export class AuthConfigurationError extends Error {
  constructor() { super('Account sign-in is unavailable.') }
}

// This screens server configuration; it never establishes a user's identity.
function publicKey(key: string) {
  if (/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) return true
  if (key.length > 4096 || key.split('.').length !== 3) return false
  try {
    const claims: unknown = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'))
    return typeof claims === 'object' && claims !== null && 'role' in claims && claims.role === 'anon'
  } catch { return false }
}

export function authConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const url = env.SUPABASE_URL
  const key = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY
  if (!url || !key || !publicKey(key)) throw new AuthConfigurationError()
  let parsed: URL
  try { parsed = new URL(url) } catch { throw new AuthConfigurationError() }
  const localFixture = env.MIDTERM_LOCAL_FIXTURE_PREVIEW === 'true'
    && parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)
  if ((parsed.protocol !== 'https:' && !localFixture) || parsed.username || parsed.password
    || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new AuthConfigurationError()
  const cookieOptions: CookieOptions = {
    httpOnly: true, secure: env.NODE_ENV === 'production' && !localFixture,
    sameSite: 'lax', path: '/', maxAge: 7 * 86400,
  }
  return { url: parsed.origin, key, cookieOptions }
}

export function isAuthCookie(name: string) {
  return name === AUTH_COOKIE_NAME || new RegExp(`^${AUTH_COOKIE_NAME}\\.\\d+$`).test(name)
}
