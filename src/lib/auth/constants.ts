export const LEGACY_AUTH_COOKIE = 'dispatch_auth'
export const LEGACY_AUTH_VALUE = 'authenticated'

export function getSupabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return null
  return { url, anonKey }
}
