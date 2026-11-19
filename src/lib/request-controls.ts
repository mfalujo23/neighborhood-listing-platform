export class JsonBodyError extends Error {
  constructor(public status: 400 | 413 | 415, message: string) { super(message) }
}

export async function readJsonBody(request: Request, maxBytes = 16 * 1024): Promise<unknown> {
  const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  if (type !== 'application/json') throw new JsonBodyError(415, 'Content-Type must be application/json.')
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) throw new JsonBodyError(413, 'Request body is too large.')
  const reader = request.body?.getReader()
  if (!reader) throw new JsonBodyError(400, 'Request body must be valid JSON.')
  const chunks: Uint8Array[] = []
  let length = 0
  for (;;) {
    const part = await reader.read()
    if (part.done) break
    length += part.value.byteLength
    if (length > maxBytes) {
      await reader.cancel()
      throw new JsonBodyError(413, 'Request body is too large.')
    }
    chunks.push(part.value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }
  catch { throw new JsonBodyError(400, 'Request body must be valid JSON.') }
}

// Per-process capacity limit only. It stores no address/contact data and does
// not claim distributed enforcement or protection of direct PostgREST writes.
export function createRequestBudget(limit = 30, windowMs = 60_000, clock = () => performance.now()) {
  let start = clock()
  let count = 0
  return {
    take() {
      const now = clock()
      if (now - start >= windowMs) { start = now; count = 0 }
      if (count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - start)) / 1000)) }
      count += 1
      return { allowed: true, retryAfter: 0 }
    },
    reset() { start = clock(); count = 0 },
  }
}
export const bookingRequestBudget = createRequestBudget()
