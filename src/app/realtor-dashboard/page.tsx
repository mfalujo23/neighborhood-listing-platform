import Link from 'next/link'
import { headers } from 'next/headers'
import { createServerAnalyticsDependencies } from '../../analytics/server'
import SummaryView from '../../analytics/SummaryView'
import type { AnalyticsSummary } from '../../analytics/metrics'

export const dynamic = 'force-dynamic'
export default async function RealtorDashboardPage() {
  const dependencies = createServerAnalyticsDependencies()
  const access = await dependencies.authorize(new Headers(await headers())).catch(() => ({ denied: 503 as const }))
  if ('denied' in access) return <main className="max-w-3xl mx-auto p-6"><h1>Dashboard access required</h1><p>A server-verified administrator or assigned provider session is required. Existing protected property-professional profiles retain read-only access. No analytics data is loaded for this request.</p><Link href="/dashboard-demo">Open the public fictional dashboard demo</Link></main>
  if (!dependencies.enabled()) return <main className="max-w-3xl mx-auto p-6"><h1>Analytics is disabled</h1><p>The server feature flag is off. No analytics dataset is loaded.</p><Link href="/dashboard-demo">Open the fictional demo</Link></main>
  const through = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.parse(`${through}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10)
  let summary: AnalyticsSummary | null = null
  try { summary = await dependencies.read(access.principal, { from, through }) }
  catch { /* Display a coarse failure without backend details. */ }
  if (!summary) return <main className="max-w-3xl mx-auto p-6"><h1>Analytics unavailable</h1><p>No partial or stale metrics are displayed. Retry through the authenticated application after configuration is verified.</p></main>
  return <main className="max-w-6xl mx-auto p-6"><h1>Protected realtor dashboard</h1><p>Server-authorized property scope. {summary.latencySource === 'fixture' ? 'Explicit fictional fixture mode.' : 'Verified provider source; missing measurements remain insufficient data.'}</p><p>{from} through {through}, UTC.</p><SummaryView summary={summary} /></main>
}
