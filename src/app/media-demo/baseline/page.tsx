import rawManifest from '../../../../config/mfalujo23-media-manifest.json'
import { MediaManifestSchema, mayDisplayAsset } from '../../../media/schema'
import { fictionalSponsorBrief } from '../../../media/copy-drafts'
import { readClassroomApproval, selectClassroomDisplayCopy } from '../../../media/classroom-copy'
import MediaDemo from '../media-client'

export const dynamic = 'force-dynamic'
export default function BaselineMediaPage() {
  const parsed = MediaManifestSchema.safeParse(rawManifest)
  if (!parsed.success || parsed.data.assets.some((asset) => !mayDisplayAsset(asset, 'fixture_test'))) return <main><h1>Media unavailable</h1><p>The comparison fixture is incomplete. No unvalidated media is displayed.</p></main>
  const manifest = parsed.data
  const selected = selectClassroomDisplayCopy(fictionalSponsorBrief)
  const decision = readClassroomApproval()
  return <MediaDemo assets={manifest.assets.filter((asset) => mayDisplayAsset(asset, 'fixture_test'))} displayCopy={selected.visible ? selected : null} classroomApproval={decision ? { variantId: decision.variantId, approverDisplayName: decision.approverDisplayName, decisionDate: decision.decisionDate } : null} baseline productionCount={manifest.assets.filter((asset) => mayDisplayAsset(asset, 'production')).length} />
}
