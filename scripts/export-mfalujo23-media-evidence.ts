import fs from 'node:fs'
import { MediaManifestSchema } from '../src/media/schema'
import { copyDrafts, fictionalSponsorBrief } from '../src/media/copy-drafts'
import { fixtureApprovedCopy } from '../src/media/copy-fixture-approved'
import { selectDisplayCopy, validateCopySubmission } from '../src/media/copy'

const manifest = MediaManifestSchema.parse(JSON.parse(fs.readFileSync('config/mfalujo23-media-manifest.json', 'utf8')))
const clock = () => new Date('2026-11-19T12:00:00Z')
const rows = manifest.assets.map((asset) => ({
  asset_id: asset.id, public_path: asset.src, source_path: asset.source.path, sha256: asset.source.sha256,
  approval_status: asset.approval.status, approval_scope: asset.approval.scope,
  human_reviewed: asset.approval.humanReviewed, approval_actor: asset.approval.actor,
  approval_date: asset.approval.date, production_status: asset.approval.productionStatus,
}))
const copyRows = [...copyDrafts, fixtureApprovedCopy].map((copy) => ({
  copy_id: copy.id, brief_id: copy.briefId, copy_text: copy.text, starts_on: copy.startsOn, ends_on: copy.endsOn,
  approval_status: copy.status, approval_scope: copy.approval.scope, human_reviewed: copy.approval.humanReviewed,
  approval_actor: copy.approval.actor, approval_date: copy.approval.date,
}))
fs.mkdirSync('docs/mfalujo23/evidence', { recursive: true })
fs.writeFileSync('supabase/local/mfalujo23-media-records.json', JSON.stringify({ fixtureOnly: true, clock: clock().toISOString(), assets: rows, copies: copyRows }, null, 2) + '\n')
fs.writeFileSync('docs/mfalujo23/evidence/lab7-copy-results.json', JSON.stringify({
  clock: clock().toISOString(), brief: fictionalSponsorBrief,
  variants: copyDrafts.map((copy) => ({ ...copy, characterCount: copy.text.length, validation: validateCopySubmission({ briefId: copy.briefId, text: copy.text, startsOn: copy.startsOn, endsOn: copy.endsOn }, fictionalSponsorBrief, clock) })),
  fixtureDisplay: selectDisplayCopy(fixtureApprovedCopy, fictionalSponsorBrief, 'fixture_test', clock),
  productionDisplay: selectDisplayCopy(fixtureApprovedCopy, fictionalSponsorBrief, 'production', clock),
  expiredDisplay: selectDisplayCopy(fixtureApprovedCopy, fictionalSponsorBrief, 'fixture_test', () => new Date('2026-11-27T00:00:00Z')),
}, null, 2) + '\n')
console.log(JSON.stringify({ assets: rows.length, draftLengths: copyDrafts.map((copy) => copy.text.length), humanReviewed: false, fixtureDisplay: true, productionDisplay: false }))
