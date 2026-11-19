import { validateCopySubmission, type SponsorBrief } from './copy'

export async function validateCopyRequest(request: Request, brief: SponsorBrief, clock: () => Date = () => new Date()) {
  const headers = { 'Cache-Control': 'no-store' }
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return Response.json({ error: { code: 'JSON_REQUIRED' } }, { status: 415, headers })
  const reader = request.body?.getReader()
  if (!reader) return Response.json({ error: { code: 'INVALID_JSON' } }, { status: 400, headers })
  let size = 0; const chunks: Uint8Array[] = []
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > 4096) { await reader.cancel().catch(() => {}); return Response.json({ error: { code: 'BODY_TOO_LARGE' } }, { status: 413, headers }) }
      chunks.push(part.value)
    }
  } catch { return Response.json({ error: { code: 'INVALID_BODY' } }, { status: 400, headers }) }
  const bytes = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  let input: unknown
  try { input = JSON.parse(new TextDecoder().decode(bytes)) }
  catch { return Response.json({ error: { code: 'INVALID_JSON' } }, { status: 400, headers }) }
  const result = validateCopySubmission(input, brief, clock)
  return Response.json(result.valid ? { valid: true, status: 'draft', humanApprovalRequired: true } : { error: result.error }, { status: result.valid ? 200 : 400, headers })
}
