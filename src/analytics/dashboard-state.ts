import type { AnalyticsSummary } from './metrics'
import type { AnalyticsFilter } from './schema'

export interface DashboardFilterState {
  summary: AnalyticsSummary | null
  filter: AnalyticsFilter | null
  error: string | null
}
