import { z } from 'zod'

const date = z.iso.date().refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, 'A real date is required.')
export const CopyInputSchema = z.object({ briefId: z.string().regex(/^[a-z0-9-]+$/), text: z.string().trim().min(1).max(120), startsOn: date, endsOn: date }).strict()
export type CopyInput = z.infer<typeof CopyInputSchema>
export interface SponsorBrief {
  id: string; businessName: string; offer: string; address: string; url: string
  startsOn: string; endsOn: string; disclaimer: string; permittedTexts: readonly string[]
}
export const CopyRecordSchema = CopyInputSchema.extend({
  id: z.string().regex(/^[a-z0-9-]+$/), status: z.enum(['draft', 'approved', 'rejected', 'expired']),
  approval: z.object({ scope: z.enum(['fixture_test', 'production']), actor: z.string().nullable(), humanReviewed: z.boolean(), date: date.nullable() }).strict(),
  factTrace: z.array(z.object({ phrase: z.string().min(1).max(120), fact: z.enum(['businessName', 'offer', 'address', 'url', 'startsOn', 'endsOn', 'disclaimer']) }).strict()).min(3),
}).strict()
export type CopyRecord = z.infer<typeof CopyRecordSchema>
const prohibited = [
  ['superlative', /\bbest\b/i], ['guarantee', /\bguarantee(?:d|s)?\b/i],
  ['urgency', /\b(?:act\s+now|limited\s+time\s+only|hurry)\b/i],
] as const
export function findProhibitedClaims(text: string) { return prohibited.filter(([, expression]) => expression.test(text)).map(([code]) => code) }

export function validateCopySubmission(input: unknown, brief: SponsorBrief, clock: () => Date = () => new Date()) {
  const parsed = CopyInputSchema.safeParse(input)
  if (!parsed.success) return { valid: false as const, error: { code: 'INVALID_COPY_SHAPE', fields: [...new Set(parsed.error.issues.map((issue) => issue.path[0] ?? 'input'))] } }
  const value = parsed.data
  if (value.briefId !== brief.id) return { valid: false as const, error: { code: 'UNKNOWN_BRIEF', fields: ['briefId'] } }
  if (findProhibitedClaims(value.text).length) return { valid: false as const, error: { code: 'PROHIBITED_CLAIM', fields: ['text'] } }
  // Closed fixture vocabulary: free model text never becomes publishable just
  // because a keyword filter missed a claim. A new paraphrase needs human review.
  if (!brief.permittedTexts.includes(value.text)) return { valid: false as const, error: { code: 'UNVERIFIED_COPY_TEXT', fields: ['text'] } }
  if (value.startsOn > value.endsOn || value.startsOn < brief.startsOn || value.endsOn > brief.endsOn) return { valid: false as const, error: { code: 'INVALID_CAMPAIGN_DATES', fields: ['startsOn', 'endsOn'] } }
  if (value.endsOn < clock().toISOString().slice(0, 10)) return { valid: false as const, error: { code: 'CAMPAIGN_EXPIRED', fields: ['endsOn'] } }
  return { valid: true as const, value, status: 'draft' as const, humanApprovalRequired: true }
}

export function selectDisplayCopy(input: unknown, brief: SponsorBrief, mode: 'fixture_test' | 'production', clock: () => Date = () => new Date()) {
  const parsed = CopyRecordSchema.safeParse(input)
  if (!parsed.success) return { visible: false as const, reason: 'INVALID_COPY_RECORD' }
  const record = parsed.data
  const validation = validateCopySubmission({ briefId: record.briefId, text: record.text, startsOn: record.startsOn, endsOn: record.endsOn }, brief, clock)
  if (!validation.valid) return { visible: false as const, reason: validation.error.code }
  const today = clock().toISOString().slice(0, 10)
  if (today < record.startsOn) return { visible: false as const, reason: 'CAMPAIGN_NOT_STARTED' }
  if (record.status !== 'approved' || record.approval.scope !== mode) return { visible: false as const, reason: 'COPY_NOT_APPROVED' }
  if (!(['businessName', 'offer', 'disclaimer'] as const).every((fact) => record.factTrace.some((trace) => trace.fact === fact && trace.phrase === brief[fact] && record.text.includes(trace.phrase)))) return { visible: false as const, reason: 'UNVERIFIED_FACT_TRACE' }
  if (mode === 'production' && (!record.approval.humanReviewed || !z.string().uuid().safeParse(record.approval.actor).success || !record.approval.date || record.approval.date > today)) return { visible: false as const, reason: 'HUMAN_APPROVAL_REQUIRED' }
  if (mode === 'fixture_test' && record.approval.actor !== 'test-fixture-only') return { visible: false as const, reason: 'INVALID_TEST_APPROVAL' }
  return { visible: true as const, text: record.text, endsOn: record.endsOn, disclosure: mode === 'fixture_test' ? 'Sponsored · fictional classroom fixture · test-only approval' : 'Sponsored partner' }
}
