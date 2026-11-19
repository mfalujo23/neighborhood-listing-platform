import { createHash } from 'node:crypto'
import { z } from 'zod'
import approvalSource from '../../config/mfalujo23-classroom-copy-approval.json'
import providerSource from '../../config/mfalujo23-provider-copy-drafts.json'
import { providerCopyDrafts, providerDraftDataAvailable } from './provider-copy'
import { validateCopySubmission, type SponsorBrief } from './copy'

// This versioned decision records a named classroom approval, not an Auth identity.
// The untouched provider response and normalized records remain draft.
export const ClassroomCopyApprovalSchema = z.object({
  schemaVersion: z.literal(1), scope: z.literal('classroom_demo'), decision: z.literal('approved'),
  decisionDate: z.literal('2026-11-19'), decisionTimePrecision: z.literal('date_only'),
  approverDisplayName: z.literal('Michael Falujo'), provenance: z.literal('explicit_user_instruction'),
  variantId: z.literal('variant-2'), approvedText: z.string().min(1).max(120), characterCount: z.literal(102),
  generationRawSha256: z.string().regex(/^[0-9a-f]{64}$/), approvedTextSha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict()

export function readClassroomApproval(input: unknown = approvalSource, clock: () => Date = () => new Date()) {
  const parsed = ClassroomCopyApprovalSchema.safeParse(input)
  if (!parsed.success || !providerDraftDataAvailable) return null
  const decision = parsed.data
  const original = providerCopyDrafts.find(record => record.id === decision.variantId)
  if (!original || decision.decisionDate > clock().toISOString().slice(0, 10)
    || decision.generationRawSha256 !== providerSource.source.rawSha256
    || decision.approvedText !== original.text || decision.characterCount !== original.text.length
    || decision.approvedTextSha256 !== createHash('sha256').update(original.text, 'utf8').digest('hex')) return null
  return decision
}

export function selectClassroomDisplayCopy(brief: SponsorBrief, input: unknown = approvalSource, clock: () => Date = () => new Date()) {
  const decision = readClassroomApproval(input, clock)
  if (!decision) return { visible: false as const, reason: 'CLASSROOM_APPROVAL_REQUIRED' }
  const original = providerCopyDrafts.find(record => record.id === decision.variantId)!
  const validation = validateCopySubmission({ briefId: original.briefId, text: decision.approvedText, startsOn: original.startsOn, endsOn: original.endsOn }, brief, clock)
  if (!validation.valid) return { visible: false as const, reason: validation.error.code }
  if (clock().toISOString().slice(0, 10) < original.startsOn) return { visible: false as const, reason: 'CAMPAIGN_NOT_STARTED' }
  if (!(['businessName', 'offer', 'url', 'disclaimer'] as const).every(fact => original.factTrace.some(trace => trace.fact === fact && trace.phrase === brief[fact] && original.text.includes(trace.phrase)))) return { visible: false as const, reason: 'UNVERIFIED_FACT_TRACE' }
  return {
    visible: true as const, text: decision.approvedText, endsOn: original.endsOn,
    disclosure: 'Sponsored · fictional classroom demo · approved classroom copy',
  }
}
