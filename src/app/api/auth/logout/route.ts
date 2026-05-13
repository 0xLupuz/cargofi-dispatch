import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAuthConfig, LEGACY_AUTH_COOKIE } from '@/lib/auth/constants'

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
  const supabaseConfig = getSupabaseAuthConfig()

  if (supabaseConfig) {
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    await supabase.auth.signOut()
  }

  res.cookies.delete(LEGACY_AUTH_COOKIE)
  return res
}
