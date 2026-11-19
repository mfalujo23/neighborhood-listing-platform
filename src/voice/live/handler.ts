import 'server-only'
import crypto from 'node:crypto'
import { z } from 'zod'
import { JsonBodyError, readJsonBody } from '../../lib/request-controls'
import { LiveFollowupInput, LivePropertyInput, LiveSponsorInput, VapiEnvelope, unavailable, type ToolExecution } from './contracts'
import { createVoiceDatabase, VoiceDataError, type VoiceDatabase } from './database'

const safeMessages = {
  INVALID_ARGUMENTS: 'Use only the exact required fields and valid property UUID or five-digit ZIP. No action was performed.',
  NOT_FOUND: 'This approved property or matching sponsor information was not found. Do not guess.',
  UNAVAILABLE: 'This information is temporarily unavailable. Do not invent an answer.',
  TIMEOUT: 'The data request timed out. Continue without sponsored information and offer a retry.',
}
function equalToken(header: string | null, expected: string) {
  if (!header || header.length > 520 || !/^Bearer [!-~]{32,512}$/.test(header)) return false
  const supplied = header.slice(7)
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(supplied).digest(), crypto.createHash('sha256').update(expected).digest())
}
export function methodNotAllowed() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } })
}
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}
export async function executeLiveTool(name: string, input: unknown, database: VoiceDatabase | null): Promise<ToolExecution> {
  try {
    let args: unknown = input
    if (typeof args === 'string') {
      try { args = JSON.parse(args) } catch { return { status: 400, error: { code: 'INVALID_ARGUMENTS', message: safeMessages.INVALID_ARGUMENTS } } }
    }
    if (name === 'get_property_details') {
      const parsed = LivePropertyInput.safeParse(args)
      if (!parsed.success) return { status: 400, error: { code: 'INVALID_ARGUMENTS', message: safeMessages.INVALID_ARGUMENTS } }
      if (!database) return unavailable()
      return { status: 200, data: { property: await database.property(parsed.data) } }
    }
    if (name === 'get_nearby_sponsors') {
      const parsed = LiveSponsorInput.safeParse(args)
      if (!parsed.success) return { status: 400, error: { code: 'INVALID_ARGUMENTS', message: safeMessages.INVALID_ARGUMENTS } }
      if (!database) return unavailable()
      return { status: 200, data: await database.sponsors(parsed.data) }
    }
    if (name === 'request_agent_followup') {
      if (!LiveFollowupInput.safeParse(args).success) return { status: 400, error: { code: 'INVALID_ARGUMENTS', message: safeMessages.INVALID_ARGUMENTS } }
      return { status: 503, error: { code: 'UNAVAILABLE', message: 'Human follow-up transport is not configured. No request was submitted and no call or message was sent.' } }
    }
    return { status: 400, error: { code: 'INVALID_ARGUMENTS', message: 'This tool is outside the approved tool list. No action was performed.' } }
  } catch (error) {
    if (error instanceof VoiceDataError) return { status: error.status, error: { code: error.code, message: safeMessages[error.code] } }
    return unavailable()
  }
}

export function createVapiToolHandler({
  token, assistantId, database,
}: { token: string; assistantId: string; database: VoiceDatabase | null }) {
  const configured = /^[!-~]{32,512}$/.test(token) && z.uuid().safeParse(assistantId).success
  return async function POST(request: Request) {
    if (request.method !== 'POST') return methodNotAllowed()
    if (!configured) return json({ error: 'Voice server configuration is unavailable.' }, 503)
    if (!equalToken(request.headers.get('authorization'), token)) return json({ error: 'Unauthorized' }, 401)
    let raw: unknown
    try { raw = await readJsonBody(request) }
    catch (error) {
      return json({ error: error instanceof JsonBodyError ? error.message : 'Invalid request body.' }, error instanceof JsonBodyError ? error.status : 400)
    }
    const parsed = VapiEnvelope.safeParse(raw)
    if (!parsed.success) return json({ error: 'Invalid voice tool envelope.' }, 400)
    const { message } = parsed.data
    const identities = [message.assistant?.id, message.call.assistantId, message.call.assistant?.id].filter((id): id is string => Boolean(id))
    if (!identities.length || identities.some(id => id.toLowerCase() !== assistantId.toLowerCase())) return json({ error: 'Assistant is not authorized.' }, 403)
    const ids = message.toolCallList.map(call => call.id)
    if (new Set(ids).size !== ids.length) return json({ error: 'Repeated tool call identifiers are not supported.' }, 400)
    // At most eight independent read-only invocations run concurrently. Each
    // database query has a2500ms deadline; no call can write or dispatch.
    const results = await Promise.all(message.toolCallList.map(async call => {
      const result = await executeLiveTool(call.function.name, call.function.arguments, database)
      return result.status === 200
        ? { toolCallId: call.id, result: JSON.stringify(result.data) }
        : { toolCallId: call.id, error: `${result.error.code}: ${result.error.message}` }
    }))
    return json({ results })
  }
}

export function configuredVapiHandler(env: NodeJS.ProcessEnv = process.env) {
  let database: VoiceDatabase | null = null
  try {
    const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
    const key = env.SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    // Hosted runtime requires TLS; loopback HTTP is an injected local-test
    // factory capability, never enabled by a model argument or runtime flag.
    if (url && key && new URL(url).protocol === 'https:') database = createVoiceDatabase({ url, publishableKey: key })
  } catch { /* Missing or privileged configuration fails closed without logging values. */ }
  return createVapiToolHandler({ token: env.VAPI_SERVER_TOKEN ?? '', assistantId: env.VAPI_ASSISTANT_ID ?? '', database })
}

