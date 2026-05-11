import { createClient } from '@supabase/supabase-js'

// Fallback values prevent build-time "supabaseUrl is required" errors.
// At runtime, real env vars are always present.
const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL     || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (for API routes only)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL     || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY    || 'placeholder-service-key',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
