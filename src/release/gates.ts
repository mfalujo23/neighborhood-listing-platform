import { z } from 'zod'

const Sha = z.string().regex(/^[0-9a-f]{40}$/i)
const Evidence = z.object({
  path: z.string().startsWith('docs/mfalujo23/release-evidence/'),
  sha256: z.string().regex(/^[0-9a-f]{64}$/i),
  scope: z.enum(['local', 'hosted']),
}).strict()
const Gate = z.object({ passed: z.literal(true), sourceCommit: Sha, evidence: z.array(Evidence).min(1) }).strict()
const AxeReport = z.object({
  route: z.string().regex(/^\/[A-Za-z0-9/_-]*$/),
  engine: z.string().regex(/^axe-core \d+\.\d+\.\d+$/),
  checkedAt: z.iso.datetime(),
  violations: z.array(z.unknown()), incomplete: z.array(z.unknown()),
  passedRules: z.number().int().positive(),
})

export function assessAccessibilityEvidence(input: unknown) {
  const parsed = AxeReport.safeParse(input)
  if (!parsed.success) return { passed: false, reason: 'INVALID_AXE_REPORT' }
  return { passed: parsed.data.violations.length === 0 && parsed.data.incomplete.length === 0,
    route: parsed.data.route, violations: parsed.data.violations.length, incomplete: parsed.data.incomplete.length }
}

export const ReleaseRecordSchema = z.object({
  commit: Sha,
  gates: z.object({
    productionBuild: Gate, automatedTests: Gate, migrationIntegrity: Gate, rls: Gate,
    accessibility: Gate, coreFlow: Gate, deploymentSmoke: Gate, rollback: Gate,
  }).strict(),
}).strict()

export function validateReleaseRecord(input: unknown, expectedCommit: string) {
  const parsed = ReleaseRecordSchema.safeParse(input)
  if (!parsed.success) return { allowed: false as const, reason: 'INCOMPLETE_RELEASE_EVIDENCE' }
  if (parsed.data.commit !== expectedCommit) return { allowed: false as const, reason: 'SOURCE_COMMIT_MISMATCH' }
  for (const gate of Object.values(parsed.data.gates)) {
    if (gate.sourceCommit !== expectedCommit) return { allowed: false as const, reason: 'STALE_GATE_EVIDENCE' }
  }
  for (const name of ['deploymentSmoke', 'rollback'] as const) {
    if (!parsed.data.gates[name].evidence.some((item) => item.scope === 'hosted')) {
      return { allowed: false as const, reason: 'HOSTED_VERIFICATION_REQUIRED' }
    }
  }
  return { allowed: true as const, record: parsed.data }
}
