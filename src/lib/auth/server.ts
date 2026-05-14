import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { getActiveUserProfile, isAdminProfile, type UserProfile } from '@/lib/auth/profile'
import { getSupabaseAuthConfig, LEGACY_AUTH_COOKIE, LEGACY_AUTH_VALUE } from '@/lib/auth/constants'

export type ServerAuthContext =
  | { strategy: 'supabase'; user: User; profile: UserProfile }
  | { strategy: 'legacy'; user: null; profile: null }

export async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  const cookieStore = await cookies()
  const supabaseConfig = getSupabaseAuthConfig()

  if (supabaseConfig) {
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // Server Components cannot always set cookies. Proxy/API auth refreshes them.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.getUser()

    if (!error && data.user) {
      const profile = await getActiveUserProfile(data.user.id)
      if (!profile) return null
      return { strategy: 'supabase', user: data.user, profile }
    }
  }

  const legacyAuth = cookieStore.get(LEGACY_AUTH_COOKIE)
  if (legacyAuth?.value === LEGACY_AUTH_VALUE) {
    return { strategy: 'legacy', user: null, profile: null }
  }

  return null
}

export async function getAdminAuthContext(): Promise<ServerAuthContext | null> {
  const auth = await getServerAuthContext()
  if (!auth) return null
  if (auth.strategy === 'legacy') return auth
  return isAdminProfile(auth.profile) ? auth : null
}
