import 'server-only'
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { authConfiguration, AUTH_COOKIE_NAME } from './config'

export function createSessionClient(cookies: CookieMethodsServer, env: NodeJS.ProcessEnv = process.env) {
  const configuration = authConfiguration(env)
  const setAll: NonNullable<CookieMethodsServer['setAll']> = (updates, headers) => cookies.setAll?.(updates.map(update => ({
    ...update,
    // Preserve the SDK's deletion/maxAge=0 and refresh expiry behavior.
    options: { ...update.options, httpOnly: true, secure: configuration.cookieOptions.secure, sameSite: 'lax', path: '/' },
  })), headers)
  return createServerClient(configuration.url, configuration.key, {
    cookieOptions: { name: AUTH_COOKIE_NAME, ...configuration.cookieOptions },
    cookies: {
      ...cookies,
      encode: 'tokens-only',
      setAll: cookies.setAll ? setAll : undefined,
    },
  })
}
