import {z} from 'zod'
import source from '../../config/mfalujo23-provider-copy-drafts.json'
import {CopyRecordSchema} from './copy'

export const ProviderDraftBatchSchema=z.object({
  briefId:z.literal('fictional-garden-v1'),
  source:z.object({tool:z.literal('Google AI Studio'),model:z.string().min(1),capturedAt:z.iso.datetime(),structuredOutputs:z.boolean(),rawSha256:z.string().regex(/^[0-9a-f]{64}$/)}).strict(),
  variants:z.array(z.object({record:CopyRecordSchema,characterCount:z.number().int().min(1).max(119),connectiveWording:z.array(z.string())}).strict()).length(3),
}).strict().refine(batch=>new Set(batch.variants.map(variant=>variant.record.id)).size===3&&batch.variants.every(variant=>variant.record.briefId===batch.briefId&&variant.characterCount===variant.record.text.length&&variant.record.status==='draft'&&variant.record.approval.scope==='production'&&!variant.record.approval.humanReviewed&&variant.record.approval.actor===null&&variant.record.approval.date===null),'Provider output must remain an unapproved draft with exact character counts.')
const parsed=ProviderDraftBatchSchema.safeParse(source)
export const providerDraftDataAvailable=parsed.success
export const providerDraftReviewRows=parsed.success?parsed.data.variants:[]
export const providerCopyDrafts=providerDraftReviewRows.map(variant=>variant.record)
