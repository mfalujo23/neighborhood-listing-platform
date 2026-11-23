import { z } from 'zod'

const hash = z.string().regex(/^[0-9a-f]{64}$/)
const dimension = z.number().int().positive().max(8192)
export const MediaAssetSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), category: z.enum(['property-photo', 'partner-banner', 'navigation-icon']),
  purpose: z.enum(['informational', 'decorative']), alt: z.string().max(240),
  width: dimension, height: dimension, src: z.string().regex(/^\/mfalujo23-media\/[a-z0-9.-]+$/),
  source: z.object({ path: z.string().regex(/^assets\/mfalujo23-media\/source\/[a-z0-9.-]+\.(png|svg)$/), kind: z.enum(['actual-built-in-image-generation', 'self-authored-svg-by-codex']), proof: z.string().regex(/^assets\/mfalujo23-media\/source\/[a-z0-9.-]+\.(json|svg)$/), format: z.enum(['png', 'svg']), width: dimension, height: dimension, bytes: z.number().int().positive(), sha256: hash }).strict(),
  permission: z.string().min(1),
  approval: z.object({ status: z.enum(['draft', 'approved', 'rejected', 'expired']), scope: z.enum(['fixture_test', 'production']), actor: z.string().min(1), humanReviewed: z.boolean(), date: z.iso.date(), productionStatus: z.enum(['draft', 'approved', 'rejected', 'expired']) }).strict(),
  renditions: z.array(z.object({ path: z.string().regex(/^\/mfalujo23-media\/[a-z0-9.-]+$/), format: z.enum(['png', 'jpeg', 'webp', 'avif', 'svg']), decoderFormat: z.string(), compression: z.string().nullable(), width: dimension, height: dimension, bytes: z.number().int().positive(), sha256: hash }).strict()).min(1),
}).strict().refine((value) => value.purpose === 'decorative' ? value.alt === '' : value.alt.trim().length > 0, 'Alt text must match the declared purpose.').refine((value) => value.renditions.some((rendition) => rendition.path === value.src), 'The displayed source must be an inventoried rendition.')
export const MediaManifestSchema = z.object({ generatedAtUTC: z.iso.datetime(), sharpVersion: z.string(), measurement: z.string(), assets: z.array(MediaAssetSchema).length(3) }).strict().refine((value) => new Set(value.assets.map((asset) => asset.category)).size === 3 && new Set(value.assets.map((asset) => asset.id)).size === 3, 'Three distinct asset categories and IDs are required.')
export type MediaAsset = z.infer<typeof MediaAssetSchema>

export function mayDisplayAsset(asset: MediaAsset, mode: 'fixture_test' | 'production') {
  if (asset.approval.status !== 'approved' || asset.approval.scope !== mode) return false
  return mode === 'fixture_test' || (asset.approval.productionStatus === 'approved' && asset.approval.humanReviewed && z.string().uuid().safeParse(asset.approval.actor).success)
}
