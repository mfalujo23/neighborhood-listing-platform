import rawManifest from '../../../config/mfalujo23-media-manifest.json'
import { MediaManifestSchema, mayDisplayAsset } from '../../media/schema'
import { fixtureApprovedCopy } from '../../media/copy-fixture-approved'
import { fictionalSponsorBrief } from '../../media/copy-drafts'
import { selectDisplayCopy } from '../../media/copy'
import MediaDemo from './media-client'

export const dynamic = 'force-dynamic'
export default function MediaDemoPage() {
  const parsed = MediaManifestSchema.safeParse(rawManifest)
  if (!parsed.success || parsed.data.assets.some((asset) => !mayDisplayAsset(asset, 'fixture_test'))) return <main><h1>Media unavailable</h1><p>The asset inventory is incomplete or lacks test-only clearance. No unvalidated media is displayed.</p></main>
  const manifest = parsed.data
  const selected = selectDisplayCopy(fixtureApprovedCopy, fictionalSponsorBrief, 'fixture_test')
  return <MediaDemo assets={manifest.assets.filter((asset) => mayDisplayAsset(asset, 'fixture_test'))} displayCopy={selected.visible ? selected : null} productionCount={manifest.assets.filter((asset) => mayDisplayAsset(asset, 'production')).length} />
}
