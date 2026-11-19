import 'server-only'

import { createClient } from '@supabase/supabase-js'

// Read credentials only when a server request actually needs privileged access.
// Importing an API route during a build must not require production secrets.
export function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase administrator configuration is missing.')
  }
  if (supabaseServiceKey.startsWith('sb_publishable_')) {
    throw new Error('Privileged Supabase configuration requires a server secret key.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
