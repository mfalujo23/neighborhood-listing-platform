import { createAuthHandlers, authMethodNotAllowed } from '../../../../auth/http'
import { createRouteSession } from '../../../../auth/server'

export const runtime = 'nodejs'
export const POST = createAuthHandlers(createRouteSession).signOut
export const GET = authMethodNotAllowed
