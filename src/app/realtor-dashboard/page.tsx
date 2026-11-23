import Link from 'next/link'
import { headers } from 'next/headers'
import { createServerAnalyticsDependencies } from '../../analytics/server'
import DashboardFilters from '../../analytics/DashboardFilters'
import type { AnalyticsSummary } from '../../analytics/metrics'
import { createRenderSessionClient } from '../../auth/server'
import SignOutButton from '../../auth/SignOutButton'
import { filterDashboard } from './actions'

export const dynamic = 'force-dynamic'
export default async function RealtorDashboardPage() {
  let sessionClient
  try { sessionClient = await createRenderSessionClient() } catch { /* Fail closed below. */ }
  const dependencies = createServerAnalyticsDependencies({ dashboardSessionClient: sessionClient })
  const access = await dependencies.authorize(new Headers(await headers())).catch(() => ({ denied: 503 as const }))
  if ('denied' in access) return <main className="max-w-3xl mx-auto p-6"><h1>Dashboard access required</h1><p>An authorized account is required to open this dashboard.</p><Link href="/login" className="inline-block rounded px-3 py-2 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2">Sign in</Link>{access.denied === 403 && <SignOutButton />}<p><Link href="/dashboard-demo">Open the public fictional dashboard demo</Link></p></main>
  if (!dependencies.enabled()) return <main className="max-w-3xl mx-auto p-6"><h1>Dashboard unavailable</h1><p>Dashboard information is temporarily unavailable.</p><SignOutButton /><Link href="/dashboard-demo">Open the fictional demo</Link></main>
  const through = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.parse(`${through}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10)
  let summary: AnalyticsSummary | null = null
  try { summary = await dependencies.read(access.principal, { from, through }) }
  catch { /* Display a coarse failure without backend details. */ }
  return <main className="max-w-6xl mx-auto p-6"><h1>Protected realtor dashboard</h1><SignOutButton /><p>Only properties allowed by your verified account are included.</p><DashboardFilters initialFilter={{ from, through }} initialState={{ summary, filter: summary ? { from, through } : null, error: summary ? null : 'Analytics could not be loaded. Please try again. No old results are displayed.' }} filterAction={filterDashboard} /></main>
}
