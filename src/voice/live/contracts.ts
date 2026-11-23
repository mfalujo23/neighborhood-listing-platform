import { z } from 'zod'

export const LivePropertyInput = z.strictObject({ property_id: z.uuid() })
export const LiveSponsorInput = z.strictObject({
  property_id: z.uuid(), zip: z.string().regex(/^[0-9]{5}$/),
})
export const LiveFollowupInput = z.strictObject({
  consent: z.literal(true), property_id: z.uuid(),
  preferred_channel: z.enum(['email', 'phone']),
})
export const liveToolDefinitions = [
  { name: 'get_property_details', description: 'Read public approved property facts. Never infer missing facts.', parameters: z.toJSONSchema(LivePropertyInput) },
  { name: 'get_nearby_sponsors', description: 'Read labeled eligible sponsored placements for an approved property and five-digit ZIP.', parameters: z.toJSONSchema(LiveSponsorInput) },
  { name: 'request_agent_followup', description: 'Check an explicitly consented follow-up request. Returns unavailable until a real protected transport is configured; never claims delivery.', parameters: z.toJSONSchema(LiveFollowupInput) },
]

export type LiveToolName = typeof liveToolDefinitions[number]['name']
export type ToolExecution = { status: 200; data: unknown } | {
  status: 400 | 404 | 503 | 504
  error: { code: 'INVALID_ARGUMENTS' | 'NOT_FOUND' | 'UNAVAILABLE' | 'TIMEOUT'; message: string }
}
export const unavailable = (): ToolExecution => ({
  status: 503, error: { code: 'UNAVAILABLE', message: 'This information is temporarily unavailable. Do not invent an answer.' },
})

const identity = z.object({ id: z.uuid() }).passthrough()
export const VapiEnvelope = z.object({
  message: z.object({
    type: z.literal('tool-calls'),
    call: z.object({ id: z.uuid(), assistantId: z.uuid().optional(), assistant: identity.optional() }).passthrough(),
    assistant: identity.optional(),
    toolCallList: z.array(z.strictObject({
      id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
      type: z.literal('function'),
      function: z.strictObject({ name: z.string().min(1).max(80), arguments: z.unknown() }),
    })).min(1).max(8),
  }).passthrough(),
}).passthrough()

