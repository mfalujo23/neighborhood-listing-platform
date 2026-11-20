import { describe, expect, it } from 'vitest'
import { assessAccessibilityEvidence, validateReleaseRecord } from '../release/gates'
const commit = 'a'.repeat(40)
function record() {
  const gate = (scope = 'local') => ({ passed: true, sourceCommit: commit, evidence: [{ path: 'docs/mfalujo23/release-evidence/fictional-unit-record.json', sha256: 'b'.repeat(64), scope }] })
  return { commit, gates: { productionBuild: gate(), automatedTests: gate(), migrationIntegrity: gate(), rls: gate(), accessibility: gate(), coreFlow: gate(), deploymentSmoke: gate('hosted'), rollback: gate('hosted') } }
}
describe('Release evidence barrier (fictional unit records only)', () => {
  it('rejects axe violations, incomplete checks and a fabricated missing-engine report', () => {
    const fixture = { route: '/listings', engine: 'axe-core 4.14.1', checkedAt: '2026-11-19T02:00:00.000Z', passedRules: 20, violations: [], incomplete: [] }
    expect(assessAccessibilityEvidence(fixture).passed).toBe(true)
    expect(assessAccessibilityEvidence({ ...fixture, violations: [{ id: 'label-content-name-mismatch' }] }).passed).toBe(false)
    expect(assessAccessibilityEvidence({ ...fixture, incomplete: [{ id: 'aria-prohibited-attr' }] }).passed).toBe(false)
    expect(assessAccessibilityEvidence({ ...fixture, engine: undefined }).passed).toBe(false)
  })
  it('requires every one of the eight gates', () => {
    const value: Record<string, unknown> = record()
    value.gates = { productionBuild: record().gates.productionBuild }
    expect(validateReleaseRecord(value, commit)).toEqual({ allowed: false, reason: 'INCOMPLETE_RELEASE_EVIDENCE' })
  })
  it('rejects a passing source record without hosted smoke and rollback', () => {
    const value = record()
    value.gates.rollback.evidence[0].scope = 'local'
    expect(validateReleaseRecord(value, commit)).toEqual({ allowed: false, reason: 'HOSTED_VERIFICATION_REQUIRED' })
  })
  it('rejects stale source or gate evidence', () => {
    expect(validateReleaseRecord(record(), 'c'.repeat(40))).toEqual({ allowed: false, reason: 'SOURCE_COMMIT_MISMATCH' })
    const value = record()
    value.gates.rls.sourceCommit = 'c'.repeat(40)
    expect(validateReleaseRecord(value, commit)).toEqual({ allowed: false, reason: 'STALE_GATE_EVIDENCE' })
  })
  it('accepts structurally complete unit data without claiming real provider execution', () => {
    expect(validateReleaseRecord(record(), commit).allowed).toBe(true)
  })
})
