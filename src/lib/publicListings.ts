import { PublicListingsResponseSchema } from '../schemas/listing'

const MAX_RESPONSE_BYTES = 1024 * 1024

export async function loadPublicListings(signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const response = await fetcher('/api/listings', {
    method: 'GET', headers: { Accept: 'application/json' },
    cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal,
  })
  if (!response.ok || !response.body
    || Number(response.headers.get('content-length') ?? 0) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel().catch(() => {})
    throw new Error('LISTINGS_UNAVAILABLE')
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      length += part.value.byteLength
      if (length > MAX_RESPONSE_BYTES) throw new Error('LISTINGS_UNAVAILABLE')
      chunks.push(part.value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  return PublicListingsResponseSchema.parse(value).data
}
