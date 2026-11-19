import 'server-only'
import { cookies } from 'next/headers'
import { createSessionClient } from './client'
import { AUTH_CACHE_HEADERS, authConfiguration, isAuthCookie } from './config'

export async function createRouteSession() {
  const store = await cookies()
  const cookieOptions = authConfiguration().cookieOptions
  let cacheHeaders: Record<string, string> = { ...AUTH_CACHE_HEADERS }
  const client = createSessionClient({
    getAll: () => store.getAll(),
    setAll(updates, headers) {
      updates.forEach(({ name, value, options }) => store.set(name, value, options))
      cacheHeaders = { ...cacheHeaders, ...headers }
    },
  })
  return {
    client,
    clear() {
      store.getAll().filter(cookie => isAuthCookie(cookie.name)).forEach(cookie =>
        store.set(cookie.name, '', { ...cookieOptions, maxAge: 0, expires: new Date(0) }))
    },
    response(response: Response) {
      Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value))
      return response
    },
  }
}

export async function createRenderSessionClient() {
  const store = await cookies()
  return createSessionClient({
    getAll: () => store.getAll(),
    // Next Server Components cannot set cookies. The route-scoped Proxy
    // refreshes and propagates cookies before this render is reached.
    setAll() {},
  })
}
