import { handleAnalyticsSummary } from '../../../analytics/http'
import { createServerAnalyticsDependencies } from '../../../analytics/server'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  return handleAnalyticsSummary(request, createServerAnalyticsDependencies())
}
