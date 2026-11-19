import type { CopyRecord } from './copy'
import { copyDrafts } from './copy-drafts'

// Separate test-only fixture. No real approver or stakeholder is represented.
export const fixtureApprovedCopy: CopyRecord = {
  ...copyDrafts[0], id: 'fixture-approved-1', status: 'approved',
  approval: { scope: 'fixture_test', actor: 'test-fixture-only', humanReviewed: false, date: '2026-11-19' },
}
