import 'server-only'

import { createClient } from '@supabase/supabase-js'

export { getSupabaseAdmin } from './supabase-server'

// Session-bound public client. Privileged credentials stay in the server-only
// lazy getter above and are never used for ordinary provider or booking writes.
export function createSupabaseUserClient(authorization?: string) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Supabase server configuration is missing.')
  return createClient(url, key, {
    ...(authorization ? { global: { headers: { Authorization: authorization } } } : {}),
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
