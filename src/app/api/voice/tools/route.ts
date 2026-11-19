import { configuredVapiHandler, methodNotAllowed } from '../../../../voice/live/handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) { return configuredVapiHandler()(request) }
export const GET = methodNotAllowed
export const PUT = methodNotAllowed
export const PATCH = methodNotAllowed
export const DELETE = methodNotAllowed
export const OPTIONS = methodNotAllowed
export const HEAD = methodNotAllowed

