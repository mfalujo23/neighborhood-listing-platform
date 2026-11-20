import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import approval from '../../config/mfalujo23-classroom-copy-approval.json'
import { readClassroomApproval, selectClassroomDisplayCopy } from '../media/classroom-copy'
import { fictionalSponsorBrief as brief } from '../media/copy-drafts'
import { providerCopyDrafts } from '../media/provider-copy'
import { selectDisplayCopy } from '../media/copy'

const clock = () => new Date('2026-11-19T12:00:00Z')

describe('Actual named classroom approval for the exact second variant', () => {
  test('records November19 at date precision and displays only the approved102-character text', () => {
    expect(readClassroomApproval(approval, clock)).toMatchObject({ decisionDate: '2026-11-19', decisionTimePrecision: 'date_only', approverDisplayName: 'Michael Falujo', scope: 'classroom_demo', variantId: 'variant-2' })
    expect(selectClassroomDisplayCopy(brief, approval, clock)).toMatchObject({ visible: true, text: 'Fictional Garden Partner: a fictional gardening guide (URL: /media-demo/partner). Classroom demo only.' })
    expect(approval.approvedText).toHaveLength(102)
  })
  test('rejects changed text, a different variant, source hash, text hash, date, name, or extra Auth field', () => {
    for (const patch of [{ approvedText: approval.approvedText + '!' }, { variantId: 'variant-1' }, { variantId: 'variant-3' }, { generationRawSha256: '0'.repeat(64) }, { approvedTextSha256: '0'.repeat(64) }, { decisionDate: '2026-11-18' }, { approverDisplayName: 'Different reviewer' }, { authUserId: '00000000-0000-0000-0000-000000000001' }]) {
      expect(selectClassroomDisplayCopy(brief, { ...approval, ...patch }, clock).visible).toBe(false)
    }
  })
  test('does not widen the existing fixture or production approval gates', () => {
    expect(readClassroomApproval({ ...approval, scope: 'production' }, clock)).toBeNull()
    expect(readClassroomApproval({ ...approval, scope: 'fixture_test' }, clock)).toBeNull()
    expect(selectDisplayCopy(approval, brief, 'production', clock).visible).toBe(false)
    expect(selectDisplayCopy(approval, brief, 'fixture_test', clock).visible).toBe(false)
    for (const rawDraft of providerCopyDrafts) expect(selectDisplayCopy(rawDraft, brief, 'production', clock).visible).toBe(false)
  })
  test('respects the actual decision date and campaign expiration', () => {
    expect(readClassroomApproval(approval, () => new Date('2026-11-18T23:59:59Z'))).toBeNull()
    expect(selectClassroomDisplayCopy(brief, approval, () => new Date('2026-11-26T23:59:59Z')).visible).toBe(true)
    expect(selectClassroomDisplayCopy(brief, approval, () => new Date('2026-11-27T00:00:00Z'))).toEqual({ visible: false, reason: 'CAMPAIGN_EXPIRED' })
    expect(readClassroomApproval(approval, () => new Date('2026-11-27T00:00:00Z'))?.decision).toBe('approved')
  })
  test('keeps all three raw model variants and original normalized records as drafts', () => {
    const raw = JSON.parse(fs.readFileSync('docs/mfalujo23/provider-artifacts/lab7/gemini-copy-generation.raw.json', 'utf8'))
    expect(raw.variants.map((variant: { status: string }) => variant.status)).toEqual(['draft', 'draft', 'draft'])
    expect(providerCopyDrafts.every(record => record.status === 'draft' && record.approval.actor === null && !record.approval.humanReviewed)).toBe(true)
    expect(providerCopyDrafts[0].id).toBe('variant-1'); expect(providerCopyDrafts[2].id).toBe('variant-3')
  })
})
