import 'server-only'
import { createHash } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSupabaseAdmin } from '../lib/supabase-server'
import type { AnalyticsDependencies } from './http'
import { aggregateAnalytics } from './metrics'
import { columnsToEvent, eventToColumns } from './rows'
import { utcBounds } from './schema'

const WindowSchema = z.object({
  truncated: z.boolean(), events: z.array(z.record(z.string(), z.unknown())),
  sponsorCtr: z.array(z.object({ neighborhood: z.string(), impression_count: z.coerce.number().int().nonnegative(), clicked_impressions: z.coerce.number().int().nonnegative(), ctr_percent: z.union([z.string(), z.number(), z.null()]) })),
}).strict()

export function createServerAnalyticsDependencies(options: { dashboardSessionClient?: SupabaseClient } = {}): AnalyticsDependencies {
  let verified: { userId: string; role: 'admin' | 'provider' | 'property_professional'; client: SupabaseClient } | null = null
  return {
    enabled: () => process.env.ENABLE_ANALYTICS === 'true',
    clock: () => new Date(),
    async authorize(headers) {
      verified = null
      const authorization = headers.get('authorization')
      const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]
      if ((!token || !authorization) && !options.dashboardSessionClient) return { denied: 401 }
      // Only the server-rendered dashboard passes a cookie-bound client.
      // API route factories keep their existing bearer-only contract.
      if (authorization && !token) return { denied: 401 }
      const url = process.env.SUPABASE_URL
      const key = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY
      if (!url || !key) return { denied: 503 }
      const client = token && authorization
        ? createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } })
        : options.dashboardSessionClient!
      const { data, error } = token ? await client.auth.getUser(token) : await client.auth.getUser()
      if (error || !data.user) return { denied: 401 }
      const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      if (profileError || !profile || !['admin', 'provider', 'property_professional'].includes(profile.role)) return { denied: 403 }
      verified = { userId: data.user.id, role: profile.role as 'admin' | 'provider' | 'property_professional', client }
      return { principal: { userId: data.user.id, role: profile.role as 'admin' | 'provider' | 'property_professional' } }
    },
    async read(principal, filter) {
      if (!verified || verified.userId !== principal.userId || verified.role !== principal.role || process.env.ENABLE_ANALYTICS !== 'true') throw new Error('Access unavailable.')
      const source = process.env.ANALYTICS_FIXTURE_MODE === 'true' ? 'fixture' : 'provider_measured'
      const bounds = utcBounds(filter)
      const { data, error } = await verified.client.rpc('analytics_event_window', {
        p_from: bounds.start, p_end_exclusive: bounds.endExclusive,
        p_property_id: filter.propertyId ?? null, p_source: source,
      })
      if (error) throw new Error('Analytics unavailable.')
      const window = WindowSchema.parse(data)
      if (window.truncated) throw new Error('Window exceeds local aggregate capacity.')
      const events = window.events.map(columnsToEvent)
      if (events.some((event) => event.source !== source)) throw new Error('Source mismatch.')
      const summary = aggregateAnalytics(events, filter, source)
      const impressions = window.sponsorCtr.reduce((total, row) => total + row.impression_count, 0)
      const clicks = window.sponsorCtr.reduce((total, row) => total + row.clicked_impressions, 0)
      // Validate the exact SQL result against the independently computed fixture definition.
      if (impressions !== summary.metrics.sponsorCtr.denominator || clicks !== summary.metrics.sponsorCtr.numerator) throw new Error('Aggregate mismatch.')
      const sqlGroups = window.sponsorCtr.map((row) => ({ neighborhood: row.neighborhood, impressions: row.impression_count, clickedImpressions: row.clicked_impressions })).sort((a, b) => a.neighborhood.localeCompare(b.neighborhood))
      if (JSON.stringify(sqlGroups) !== JSON.stringify(summary.neighborhoods.map(({ neighborhood, impressions, clickedImpressions }) => ({ neighborhood, impressions, clickedImpressions })))) throw new Error('Neighborhood aggregate mismatch.')
      return summary
    },
    async write(principal, event) {
      if (!verified || verified.userId !== principal.userId || verified.role !== principal.role || principal.role === 'property_professional' || process.env.ENABLE_ANALYTICS !== 'true' || process.env.ANALYTICS_FIXTURE_MODE !== 'true') return 'forbidden'
      let propertyQuery = verified.client.from('properties').select('id').eq('id', event.propertyId)
      if (principal.role !== 'admin') propertyQuery = propertyQuery.eq('owner_id', principal.userId)
      const property = await propertyQuery.maybeSingle()
      if (property.error || !property.data) return 'forbidden'
      const columns = eventToColumns(event)
      const fingerprint = createHash('sha256').update(JSON.stringify(columns)).digest('hex')
      const admin = getSupabaseAdmin()
      if (event.name === 'sponsor_click') {
        const parent = await admin.from('analytics_events').select('event_id').eq('event_id', event.properties.impressionId).eq('event_name', 'sponsor_impression').eq('property_id', event.propertyId).eq('correlation_id', event.correlationId).eq('source', event.source).maybeSingle()
        if (parent.error || !parent.data) return 'conflict'
      }
      const result = await admin.from('analytics_events').insert({ ...columns, payload_hash: fingerprint })
      if (!result.error) return 'accepted'
      if (result.error.code !== '23505') throw new Error('Analytics unavailable.')
      const existing = await admin.from('analytics_events').select('payload_hash').eq('event_id', event.eventId).maybeSingle()
      if (existing.error) throw new Error('Analytics unavailable.')
      return existing.data?.payload_hash === fingerprint ? 'duplicate' : 'conflict'
    },
  }
}
