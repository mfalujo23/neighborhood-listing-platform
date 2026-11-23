import fs from 'node:fs'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { describe, expect, test } from 'vitest'
import manifestInput from '../../config/mfalujo23-media-manifest.json'
import { MediaAssetSchema, MediaManifestSchema, mayDisplayAsset } from '../media/schema'
import { CopyRecordSchema, findProhibitedClaims, selectDisplayCopy, validateCopySubmission } from '../media/copy'
import { fictionalSponsorBrief as brief, copyDrafts } from '../media/copy-drafts'
import { fixtureApprovedCopy } from '../media/copy-fixture-approved'
import { validateCopyRequest } from '../media/http'

const clock = () => new Date('2026-11-19T12:00:00Z')
const manifest = MediaManifestSchema.parse(manifestInput)
const candidate = { briefId: brief.id, text: copyDrafts[0].text, startsOn: brief.startsOn, endsOn: brief.endsOn }

describe('Actual asset files, formats, provenance and gates', () => {
  test('three distinct displayed categories have existing sources and valid SHA256 provenance', () => {
    expect(new Set(manifest.assets.map((asset) => asset.category)).size).toBe(3)
    for (const asset of manifest.assets) {
      const bytes = fs.readFileSync(asset.source.path)
      expect(bytes.length).toBe(asset.source.bytes)
      expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(asset.source.sha256)
      expect(fs.existsSync(asset.source.proof)).toBe(true)
    }
  })
  test('every derivative is truly its declared format, dimensions, bytes and hash', async () => {
    for (const asset of manifest.assets) for (const rendition of asset.renditions) {
      const bytes = fs.readFileSync(`public${rendition.path}`)
      const decoded = await sharp(bytes).metadata()
      expect(decoded.format).toBe(rendition.decoderFormat)
      if (rendition.format === 'avif') { expect(decoded.format).toBe('heif'); expect(decoded.compression).toBe('av1'); expect(bytes.toString('ascii', 4, 12)).toBe('ftypavif') }
      else expect(decoded.format).toBe(rendition.format)
      expect(decoded.width).toBe(rendition.width); expect(decoded.height).toBe(rendition.height)
      expect(bytes.length).toBe(rendition.bytes)
      expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(rendition.sha256)
      expect(decoded.exif).toBeUndefined()
    }
  })
  test('raster renditions preserve16:9 without enlarging the generated original', () => {
    const property = manifest.assets[0]
    for (const output of property.renditions) {
      expect(output.width / output.height).toBe(16 / 9)
      expect(output.width).toBeLessThanOrEqual(property.source.width)
    }
    const baseline = property.renditions.find((item) => item.format === 'jpeg')!
    const primary = property.renditions.find((item) => item.path === property.src)!
    expect(primary.width).toBe(baseline.width); expect(primary.height).toBe(baseline.height)
    expect(primary.bytes).toBeLessThan(baseline.bytes)
  })
  test('source PNG is outside public and production approval fails closed', () => {
    expect(fs.existsSync('public/mfalujo23-media/property-generated-v1.png')).toBe(false)
    expect(manifest.assets.every((asset) => mayDisplayAsset(asset, 'fixture_test'))).toBe(true)
    expect(manifest.assets.some((asset) => mayDisplayAsset(asset, 'production'))).toBe(false)
  })
  test('wrong purpose alt, unsafe filename and duplicated asset categories are rejected', () => {
    expect(MediaAssetSchema.safeParse({ ...manifest.assets[2], alt: 'Duplicate Home label' }).success).toBe(false)
    expect(MediaAssetSchema.safeParse({ ...manifest.assets[0], src: '/mfalujo23-media/ broken.webp' }).success).toBe(false)
    expect(MediaManifestSchema.safeParse({ ...manifest, assets: [manifest.assets[0], manifest.assets[0], manifest.assets[2]] }).success).toBe(false)
  })
})
describe('Copy shape, approved facts and actual review boundaries', () => {
  test('three Codex drafts validate as drafts and have fact-to-phrase traces', () => {
    for (const draft of copyDrafts) {
      expect(CopyRecordSchema.safeParse(draft).success).toBe(true)
      const result = validateCopySubmission({ briefId: draft.briefId, text: draft.text, startsOn: draft.startsOn, endsOn: draft.endsOn }, brief, clock)
      expect(result).toMatchObject({ valid: true, status: 'draft', humanApprovalRequired: true })
      expect(draft.text.length).toBeLessThanOrEqual(120)
      expect(draft.factTrace.every((trace) => draft.text.includes(trace.phrase))).toBe(true)
    }
  })
  test.each([null, undefined, 8, {}, { text: null }])('malformed input is a safe result, not a crash: %s', (input) => {
    expect(validateCopySubmission(input, brief, clock)).toMatchObject({ valid: false })
  })
  test('maximum length, whitespace-only text and client approval fields are rejected', () => {
    for (const input of [{ ...candidate, text: 'x'.repeat(121) }, { ...candidate, text: ' ' }, { ...candidate, status: 'approved' }]) expect(validateCopySubmission(input, brief, clock)).toMatchObject({ valid: false, error: { code: 'INVALID_COPY_SHAPE' } })
  })
  test('word boundaries avoid the inherited Bestow false positive', () => {
    expect(findProhibitedClaims('Bestow a garden visit.')).toEqual([])
    expect(findProhibitedClaims('Guaranteed results. Act now.')).toEqual(['guarantee', 'urgency'])
  })
  test('unsupported factual, discriminatory and urgency text cannot publish', () => {
    for (const text of ['Free inspections and24-hour service.', 'Homes for families only.', 'Hurry, act now.']) expect(validateCopySubmission({ ...candidate, text }, brief, clock)).toMatchObject({ valid: false })
    expect(validateCopySubmission({ ...candidate, text: 'Free inspections and24-hour service.' }, brief, clock)).toMatchObject({ error: { code: 'UNVERIFIED_COPY_TEXT' } })
  })
  test('unknown brief, invalid real dates and outside brief dates fail', () => {
    expect(validateCopySubmission({ ...candidate, briefId: 'unknown' }, brief, clock)).toMatchObject({ error: { code: 'UNKNOWN_BRIEF' } })
    expect(validateCopySubmission({ ...candidate, endsOn: '2026-02-30' }, brief, clock)).toMatchObject({ valid: false })
    expect(validateCopySubmission({ ...candidate, endsOn: '2026-12-01' }, brief, clock)).toMatchObject({ error: { code: 'INVALID_CAMPAIGN_DATES' } })
  })
  test('end date is inclusive and midnight after it removes the offer', () => {
    expect(selectDisplayCopy(fixtureApprovedCopy, brief, 'fixture_test', () => new Date('2026-11-26T23:59:59Z')).visible).toBe(true)
    expect(selectDisplayCopy(fixtureApprovedCopy, brief, 'fixture_test', () => new Date('2026-11-27T00:00:00Z'))).toMatchObject({ visible: false, reason: 'CAMPAIGN_EXPIRED' })
    expect(selectDisplayCopy(fixtureApprovedCopy, brief, 'fixture_test', () => new Date('2026-11-18T23:59:59Z'))).toMatchObject({ visible: false, reason: 'CAMPAIGN_NOT_STARTED' })
  })
  test('drafts and fixture approval never satisfy production approval', () => {
    expect(selectDisplayCopy(copyDrafts[0], brief, 'production', clock).visible).toBe(false)
    expect(selectDisplayCopy(fixtureApprovedCopy, brief, 'production', clock).visible).toBe(false)
    expect(selectDisplayCopy(fixtureApprovedCopy, brief, 'fixture_test', clock)).toMatchObject({ visible: true, disclosure: 'Sponsored · fictional classroom fixture · test-only approval' })
  })
  test('malformed records, rejected statuses and missing fact evidence fail closed', () => {
    expect(selectDisplayCopy(null, brief, 'fixture_test', clock).visible).toBe(false)
    expect(selectDisplayCopy({ ...fixtureApprovedCopy, status: 'rejected' }, brief, 'fixture_test', clock).visible).toBe(false)
    expect(selectDisplayCopy({ ...fixtureApprovedCopy, factTrace: fixtureApprovedCopy.factTrace.map((trace) => ({ ...trace, phrase: 'not in the brief' })) }, brief, 'fixture_test', clock)).toMatchObject({ visible: false, reason: 'UNVERIFIED_FACT_TRACE' })
  })
})
describe('Server validation does not approve or echo unsafe input', () => {
  const request = (body: unknown) => new Request('http://localhost/api/media/validate-copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  test('valid request stays a human-review-required draft', async () => {
    const response = await validateCopyRequest(request(candidate), brief, clock)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ valid: true, status: 'draft', humanApprovalRequired: true })
  })
  test('oversize, malformed JSON, content type and method errors are safe', async () => {
    expect((await validateCopyRequest(request({ text: 'x'.repeat(5000) }), brief, clock)).status).toBe(413)
    expect((await validateCopyRequest(new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), brief, clock)).status).toBe(400)
    expect((await validateCopyRequest(new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }), brief, clock)).status).toBe(415)
    expect((await validateCopyRequest(new Request('http://localhost'), brief, clock)).status).toBe(405)
  })
  test('unknown claim returns a fixed error without storing or echoing its content', async () => {
    const response = await validateCopyRequest(request({ ...candidate, text: 'Private unsupported source text.' }), brief, clock)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('{"error":{"code":"UNVERIFIED_COPY_TEXT","fields":["text"]}}')
  })
  test('aborted request streams return a safe error instead of an unhandled exception', async () => {
    const stream = new ReadableStream({ start(controller) { controller.error(new Error('private stream detail')) } })
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit & { duplex: 'half' }
    const response = await validateCopyRequest(new Request('http://localhost', init), brief, clock)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('{"error":{"code":"INVALID_BODY"}}')
  })
})
