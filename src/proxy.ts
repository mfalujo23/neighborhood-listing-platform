import { NextResponse, type NextRequest } from 'next/server'
import { createSessionClient } from './auth/client'
import { AUTH_CACHE_HEADERS } from './auth/config'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  Object.entries(AUTH_CACHE_HEADERS).forEach(([name, value]) => response.headers.set(name, value))
  // Existing manually authenticated page consumers still reach the page's
  // verified bearer path. No API route is matched by this Proxy.
  if (request.headers.has('authorization')) return response
  try {
    const client = createSessionClient({
      getAll: () => request.cookies.getAll(),
      setAll(updates, cacheHeaders) {
        updates.forEach(({ name, value }) => request.cookies.set(name, value))
        const previous = response.cookies.getAll()
        response = NextResponse.next({ request })
        previous.forEach(cookie => response.cookies.set(cookie))
        updates.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries({ ...AUTH_CACHE_HEADERS, ...cacheHeaders }).forEach(([name, value]) => response.headers.set(name, value))
      },
    })
    // Refresh/verify through Auth; getSession's embedded user is never trusted.
    await client.auth.getUser()
  } catch { /* The page/route makes its own fresh authorization decision. */ }
  return response
}

export const config = { matcher: ['/realtor-dashboard/:path*', '/login'] }
