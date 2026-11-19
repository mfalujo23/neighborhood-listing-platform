import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { LiveFollowupInput, LivePropertyInput, LiveSponsorInput, liveToolDefinitions } from '../voice/live/contracts'
import { createVoiceDatabase, isPublicSupabaseKey, PROPERTY_PROJECTION, VoiceDataError, VOICE_QUERY_TIMEOUT_MS } from '../voice/live/database'
import { configuredVapiHandler, createVapiToolHandler, executeLiveTool } from '../voice/live/handler'

const propertyId = '60000000-0000-4000-8000-000000000001'
const assistantId = '70000000-0000-4000-8000-000000000001'
const callId = '80000000-0000-4000-8000-000000000001'
const token = 'synthetic-vapi-test-token-with-no-real-credentials'
const publicKey = 'sb_publishable_synthetic_local_fixture_only'
const property = {
  id: propertyId, title: 'Fictional Cedar Court', description: 'Fictional teaching property.',
  street: '101 Example Court', city: 'Demo City', state: 'CA', zip_code: '90032',
  price: 625000, bedrooms: 2, bathrooms: 1, square_feet: 900, amenities: ['Sample courtyard'], approved: true,
}
const sponsor = {
  id: 'synthetic-sponsor', business_name: 'Fictional Garden Partner', destination_url: 'https://example.com/partner',
  status: 'APPROVED', is_active: true, placement: 'sidebar', start_date: '2026-01-01', end_date: '2026-12-31',
  target_zip_codes: ['90032'], coverage_radius_miles: '3.00', tier: 'Gold', impression_count: 0, distance_miles: '1.00',
}
const envelope = (name = 'get_property_details', args: unknown = { property_id: propertyId }) => ({
  message: { type: 'tool-calls', call: { id: callId, assistantId },
    toolCallList: [{ id: 'synthetic-tool-1', type: 'function', function: { name, arguments: args } }] },
})
const request = (body: unknown, authorization: string | null = `Bearer ${token}`) => new Request('https://course.example/api/voice/tools', {
  method: 'POST', headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) }, body: JSON.stringify(body),
})
function database(fetchImpl: typeof fetch) {
  return createVoiceDatabase({ url: 'https://project.example', publishableKey: publicKey, fetchImpl, clock: () => new Date('2026-11-19T12:00:00Z') })
}
const withRows = (rows: unknown = [property]) => vi.fn<typeof fetch>(async () => Response.json(rows))

describe('live tool contracts', () => {
  it('uses three separately generated strict UUID contracts', () => {
    expect(liveToolDefinitions.map(t => t.name)).toEqual(['get_property_details', 'get_nearby_sponsors', 'request_agent_followup'])
    expect(LivePropertyInput.safeParse({ property_id: propertyId }).success).toBe(true)
    expect(LivePropertyInput.safeParse({ property_id: 'demo-001' }).success).toBe(false)
    expect(LivePropertyInput.safeParse({ property_id: propertyId, approved: true }).success).toBe(false)
    expect(LiveSponsorInput.safeParse({ property_id: propertyId, zip: '9003290032' }).success).toBe(false)
    expect(LiveSponsorInput.safeParse({ property_id: propertyId, zip: 90032 }).success).toBe(false)
    expect(LiveFollowupInput.safeParse({ property_id: propertyId, consent: false, preferred_channel: 'phone' }).success).toBe(false)
  })
  it('rejects privileged key types before constructing a request', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')
    expect(isPublicSupabaseKey(`eyJsynthetic.${payload}.synthetic`)).toBe(false)
    expect(isPublicSupabaseKey('sb_secret_synthetic_never_valid')).toBe(false)
    expect(() => createVoiceDatabase({ url: 'https://project.example', publishableKey: 'sb_secret_synthetic_never_valid' })).toThrow('UNAVAILABLE')
  })
  it('accepts only an explicitly anon legacy JWT key type', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')
    expect(isPublicSupabaseKey(`eyJsynthetic.${payload}.synthetic`)).toBe(true)
    expect(isPublicSupabaseKey('unrecognized')).toBe(false)
  })
  it.each(['http://public.example', 'https://user:password@project.example', 'https://project.example/path', 'https://project.example/?secret=x'])('rejects unsafe database URL %s', url => {
    expect(() => createVoiceDatabase({ url, publishableKey: publicKey })).toThrow('UNAVAILABLE')
  })
})

describe('approved database reads', () => {
  it('uses only publishable apikey, fixed public projection and approved UUID filter', async () => {
    const transport = withRows()
    const result = await database(transport).property({ property_id: propertyId })
    const [input, init] = transport.mock.calls[0]
    const url = new URL(String(input))
    expect(url.pathname).toBe('/rest/v1/properties')
    expect(url.searchParams.get('select')).toBe(PROPERTY_PROJECTION)
    expect(url.searchParams.get('id')).toBe(`eq.${propertyId}`)
    expect(url.searchParams.get('approved')).toBe('eq.true')
    expect(url.searchParams.get('limit')).toBe('1')
    expect(init?.headers).toMatchObject({ apikey: publicKey })
    expect(init?.headers).not.toHaveProperty('Authorization')
    expect(init?.redirect).toBe('error')
    expect(result).not.toHaveProperty('approved')
    expect(result).not.toHaveProperty('owner_id')
  })
  it('returns NOT_FOUND for anonymous empty reads', async () => {
    await expect(database(withRows([])).property({ property_id: propertyId })).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })
  it('omits a SQL-null optional description without inventing a value', async () => {
    const result = await database(withRows([{ ...property, description: null }])).property({ property_id: propertyId })
    expect(result.id).toBe(propertyId)
    expect(result).not.toHaveProperty('description')
  })
  it.each([
    { rows: [{ ...property, approved: false }] },
    { rows: [{ ...property, owner_id: 'private-owner' }] },
    { rows: [{ ...property, id: '60000000-0000-4000-8000-000000000002' }] },
    { rows: [{ ...property, price: -1 }] },
    { rows: [property, property] },
  ])('fails closed on unexpected property payload %#', async ({ rows }) => {
    await expect(database(withRows(rows)).property({ property_id: propertyId })).rejects.toMatchObject({ status: 503 })
  })
  it('does not request a database for invalid direct input', async () => {
    const transport = withRows()
    await expect(database(transport).property({ property_id: 'demo-001' })).rejects.toBeDefined()
    expect(transport).not.toHaveBeenCalled()
  })
  it('never returns raw database errors', async () => {
    const transport = vi.fn<typeof fetch>(async () => new Response('private error detail', { status: 500 }))
    const result = await executeLiveTool('get_property_details', { property_id: propertyId }, database(transport))
    expect(result).toMatchObject({ status: 503, error: { code: 'UNAVAILABLE' } })
    expect(JSON.stringify(result)).not.toContain('private error')
  })
  it('bounds database response bodies', async () => {
    const transport = vi.fn<typeof fetch>(async () => new Response('x'.repeat(65537)))
    await expect(database(transport).property({ property_id: propertyId })).rejects.toMatchObject({ status: 503 })
  })
  it('uses the real eligible sponsor RPC and revalidates safe eligible output', async () => {
    const transport = vi.fn<typeof fetch>(async input => String(input).includes('/rpc/') ? Response.json([sponsor]) : Response.json([property]))
    const result = await database(transport).sponsors({ property_id: propertyId, zip: '90032' })
    expect(result.sponsors).toEqual([{ id: sponsor.id, name: sponsor.business_name }])
    expect(result.disclosure).toContain('Sponsored')
    const [input, init] = transport.mock.calls[1]
    expect(new URL(String(input)).pathname).toBe('/rest/v1/rpc/eligible_sponsors_for_property')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ p_property_id: propertyId, p_zip: '90032', p_placement: 'sidebar' })
  })
  it('does not query sponsors for a different property ZIP', async () => {
    const transport = withRows()
    await expect(database(transport).sponsors({ property_id: propertyId, zip: '90033' })).rejects.toMatchObject({ status: 404 })
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it('returns an actual empty list without inventing a house sponsor', async () => {
    const transport = vi.fn<typeof fetch>(async input => String(input).includes('/rpc/') ? Response.json([]) : Response.json([property]))
    expect((await database(transport).sponsors({ property_id: propertyId, zip: '90032' })).sponsors).toEqual([])
  })
  it.each([
    { ...sponsor, status: 'PENDING' },
    { ...sponsor, id: 42 },
    { ...sponsor, internal_notes: 'private note' },
  ])('fails closed on malformed sponsor projection %#', async row => {
    const transport = vi.fn<typeof fetch>(async input => String(input).includes('/rpc/') ? Response.json([row]) : Response.json([property]))
    await expect(database(transport).sponsors({ property_id: propertyId, zip: '90032' })).rejects.toMatchObject({ status: 503 })
  })
  it('filters unsafe campaign destinations even if returned by the RPC', async () => {
    const transport = vi.fn<typeof fetch>(async input => String(input).includes('/rpc/') ? Response.json([{ ...sponsor, destination_url: 'javascript:alert(1)' }]) : Response.json([property]))
    expect((await database(transport).sponsors({ property_id: propertyId, zip: '90032' })).sponsors).toEqual([])
  })
  it('uses2500ms production query budget and actually aborts a delayed transport', async () => {
    expect(VOICE_QUERY_TIMEOUT_MS).toBe(2500)
    const transport = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('synthetic transport aborted')), { once: true })
    }))
    const db = createVoiceDatabase({ url: 'https://project.example', publishableKey: publicKey, fetchImpl: transport, timeoutMs: 20 })
    await expect(db.property({ property_id: propertyId })).rejects.toMatchObject({ status: 504, code: 'TIMEOUT' })
  })
})

describe('authenticated provider envelope', () => {
  it.each([null, 'Bearer wrong', `Bearer ${'z'.repeat(48)}`, `Bearer ${'z'.repeat(600)}`])('denies invalid auth before data work %#', async authorization => {
    const transport = withRows()
    const response = await createVapiToolHandler({ token, assistantId, database: database(transport) })(request(envelope(), authorization))
    expect(response.status).toBe(401)
    expect(transport).not.toHaveBeenCalled()
  })
  it('fails closed for missing server configuration', async () => {
    expect((await configuredVapiHandler({ NODE_ENV: 'test' })(request(envelope()))).status).toBe(503)
  })
  it('rejects the wrong assistant without querying', async () => {
    const transport = withRows()
    const body = envelope()
    body.message.call.assistantId = '70000000-0000-4000-8000-000000000002'
    expect((await createVapiToolHandler({ token, assistantId, database: database(transport) })(request(body))).status).toBe(403)
    expect(transport).not.toHaveBeenCalled()
  })
  it('rejects conflicting assistant identities', async () => {
    const body = { message: { ...envelope().message, assistant: { id: '70000000-0000-4000-8000-000000000002' } } }
    expect((await createVapiToolHandler({ token, assistantId, database: null })(request(body))).status).toBe(403)
  })
  it('requires a call context and rejects raw dashboard parameter bodies', async () => {
    expect((await createVapiToolHandler({ token, assistantId, database: null })(request({ property_id: propertyId }))).status).toBe(400)
  })
  it('returns a correlated single-line result and ignores unpersisted PII metadata', async () => {
    const body = { message: { ...envelope().message, customer: { number: 'redacted-test-marker' }, artifact: { transcript: 'private synthetic marker' } } }
    const response = await createVapiToolHandler({ token, assistantId, database: database(withRows()) })(request(body))
    const value = await response.json()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(value.results[0].toolCallId).toBe('synthetic-tool-1')
    expect(value.results[0].result).not.toMatch(/[\r\n]/)
    expect(JSON.stringify(value)).not.toContain('private synthetic marker')
    expect(JSON.parse(value.results[0].result).property.id).toBe(propertyId)
  })
  it('translates real adapter504 into HTTP200 error without a result', async () => {
    const db = { property: async () => property, sponsors: async () => { throw new VoiceDataError(504, 'TIMEOUT') } }
    const response = await createVapiToolHandler({ token, assistantId, database: db })(request(envelope('get_nearby_sponsors', { property_id: propertyId, zip: '90032' })))
    expect(response.status).toBe(200)
    const value = await response.json()
    expect(value.results[0].error).toContain('TIMEOUT')
    expect(value.results[0]).not.toHaveProperty('result')
  })
  it.each([
    ['get_property_details', { property_id: 'demo-001' }],
    ['get_nearby_sponsors', { property_id: propertyId, zip: '9003290032' }],
    ['request_agent_followup', { property_id: propertyId, consent: false, preferred_channel: 'phone' }],
    ['delete_all_records', {}],
  ])('rejects invalid tool %s without database or action', async (name, args) => {
    const transport = withRows()
    const response = await createVapiToolHandler({ token, assistantId, database: database(transport) })(request(envelope(name, args)))
    expect(response.status).toBe(200)
    expect((await response.json()).results[0].error).toContain('INVALID_ARGUMENTS')
    expect(transport).not.toHaveBeenCalled()
  })
  it('truthfully reports followup unavailable and performs zero network calls', async () => {
    const transport = withRows()
    const response = await createVapiToolHandler({ token, assistantId, database: database(transport) })(request(envelope('request_agent_followup', { property_id: propertyId, consent: true, preferred_channel: 'phone' })))
    expect((await response.json()).results[0].error).toContain('No request was submitted')
    expect(transport).not.toHaveBeenCalled()
  })
  it('accepts protocol arguments encoded as JSON strings and validates their content', async () => {
    const response = await createVapiToolHandler({ token, assistantId, database: database(withRows()) })(request(envelope('get_property_details', JSON.stringify({ property_id: propertyId }))))
    expect((await response.json()).results[0]).toHaveProperty('result')
  })
  it('returns one result for every independent read-only call', async () => {
    const body = envelope()
    body.message.toolCallList.push({ ...body.message.toolCallList[0], id: 'synthetic-tool-2' })
    const response = await createVapiToolHandler({ token, assistantId, database: database(withRows()) })(request(body))
    expect((await response.json()).results.map((r: { toolCallId: string }) => r.toolCallId)).toEqual(['synthetic-tool-1', 'synthetic-tool-2'])
  })
  it('rejects duplicate IDs and oversized lists before data access', async () => {
    const transport = withRows()
    const handle = createVapiToolHandler({ token, assistantId, database: database(transport) })
    const duplicate = envelope()
    duplicate.message.toolCallList.push(duplicate.message.toolCallList[0])
    expect((await handle(request(duplicate))).status).toBe(400)
    const over = envelope()
    over.message.toolCallList = Array.from({ length: 9 }, (_, i) => ({ ...over.message.toolCallList[0], id: `call-${i}` }))
    expect((await handle(request(over))).status).toBe(400)
    expect(transport).not.toHaveBeenCalled()
  })
  it('enforces method, content-type, JSON and body-size boundaries', async () => {
    const handle = createVapiToolHandler({ token, assistantId, database: null })
    expect((await handle(new Request('https://course.example', { method: 'GET' }))).status).toBe(405)
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'text/plain' }
    expect((await handle(new Request('https://course.example', { method: 'POST', headers, body: '{}' }))).status).toBe(415)
    headers['content-type'] = 'application/json'
    expect((await handle(new Request('https://course.example', { method: 'POST', headers, body: '{' }))).status).toBe(400)
    expect((await handle(new Request('https://course.example', { method: 'POST', headers, body: 'x'.repeat(16385) }))).status).toBe(413)
  })
})

