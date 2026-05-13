import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getActiveUserProfile } from '@/lib/auth/profile'
import { getSupabaseAuthConfig, LEGACY_AUTH_COOKIE, LEGACY_AUTH_VALUE } from '@/lib/auth/constants'

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function isCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`
}

export async function requireApiAuth(request: NextRequest) {
  let response = NextResponse.next()
  const supabaseConfig = getSupabaseAuthConfig()

  if (supabaseConfig) {
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value)
            })
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.getUser()

    if (!error && data.user) {
      const profile = await getActiveUserProfile(data.user.id)
      return profile ? response : unauthorized()
    }
  }

  const legacyAuth = request.cookies.get(LEGACY_AUTH_COOKIE)
  if (legacyAuth?.value === LEGACY_AUTH_VALUE) {
    return response
  }

  return unauthorized()
}
