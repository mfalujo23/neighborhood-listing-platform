'use client'

import { useState } from 'react'

type AuditReport = {
  route: string
  engine: string
  checkedAt: string
  violations: { id: string; impact: string | null; help: string; helpUrl: string; targets: string[][] }[]
  incomplete: { id: string; help: string; targets: string[][] }[]
  passedRules: number
}

export default function LocalAccessibilityAudit() {
  const [running, setRunning] = useState(false)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [error, setError] = useState(false)
  async function audit() {
    setRunning(true)
    setError(false)
    setReport(null)
    try {
      const axe = (await import('axe-core')).default
      const result = await axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      })
      setReport({
        route: window.location.pathname,
        engine: result.testEngine.name + ' ' + result.testEngine.version,
        checkedAt: new Date().toISOString(),
        violations: result.violations.map((item) => ({
          id: item.id, impact: item.impact ?? null, help: item.help, helpUrl: item.helpUrl,
          targets: item.nodes.map((node) => node.target.map(String)),
        })),
        incomplete: result.incomplete.map((item) => ({
          id: item.id, help: item.help, targets: item.nodes.map((node) => node.target.map(String)),
        })),
        passedRules: result.passes.length,
      })
    } catch { setError(true) }
    finally { setRunning(false) }
  }
  return (
    <section aria-labelledby="local-audit-heading" className="mx-auto my-8 max-w-5xl rounded border border-slate-600 bg-white p-5">
      <h2 id="local-audit-heading" className="text-xl font-semibold">Local accessibility audit</h2>
      <p>Run automated checks on this rendered page. Keyboard and screen-reader review remain separate.</p>
      <button type="button" disabled={running} onClick={() => void audit()} className="my-3 rounded border border-slate-700 px-4 py-2 font-semibold focus-visible:ring-2 focus-visible:ring-offset-2">
        {running ? 'Running accessibility checks…' : 'Run accessibility checks'}
      </button>
      {error && <p role="alert">The audit could not complete. Record this failure and investigate before release.</p>}
      {report && (
        <div>
          <p role="status">Audit complete: {report.violations.length} violations; {report.incomplete.length} checks need review.</p>
          <details>
            <summary className="cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2">View audit JSON</summary>
            <pre aria-label="Accessibility audit JSON" className="max-h-96 overflow-auto whitespace-pre-wrap break-words border border-slate-400 p-3">{JSON.stringify(report, null, 2)}</pre>
          </details>
        </div>
      )}
    </section>
  )
}
