'use server'

import { createRenderSessionClient } from '../../auth/server'
import { createServerAnalyticsDependencies } from '../../analytics/server'
import { AnalyticsFilterSchema } from '../../analytics/schema'
import type { DashboardFilterState } from '../../analytics/dashboard-state'

const failed = (error: string): DashboardFilterState => ({ summary: null, filter: null, error })

export async function filterDashboard(previousState: DashboardFilterState, formData: FormData): Promise<DashboardFilterState> {
  // Previous state is client input, never an authority for identity or metrics.
  void previousState
  try {
    const sessionClient = await createRenderSessionClient()
    const dependencies = createServerAnalyticsDependencies({ dashboardSessionClient: sessionClient })
    // This action uses the verified cookie session; the bearer-only API is separate.
    const access = await dependencies.authorize(new Headers())
    if ('denied' in access) return failed('Dashboard access is unavailable. Sign in with an authorized account and try again.')
    if (!dependencies.enabled()) return failed('Dashboard information is temporarily unavailable. Please try again later.')

    const fields: Record<string, string> = {}
    for (const name of ['from', 'through', 'propertyId']) {
      const values = formData.getAll(name)
      if (values.length !== 1 || typeof values[0] !== 'string') return failed('Enter valid dates and an optional property ID.')
      fields[name] = values[0].trim()
    }
    const filter = AnalyticsFilterSchema.safeParse({ from: fields.from, through: fields.through, ...(fields.propertyId ? { propertyId: fields.propertyId } : {}) })
    if (!filter.success) return failed('Enter real dates in order and a valid property ID, or leave the property ID blank.')
    const summary = await dependencies.read(access.principal, filter.data)
    return { summary, filter: filter.data, error: null }
  } catch {
    return failed('Analytics could not be loaded. Please try again. No old results are displayed.')
  }
}
