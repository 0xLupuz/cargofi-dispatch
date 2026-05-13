import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getActiveUserProfile } from '@/lib/auth/profile'
import { getSupabaseAuthConfig, LEGACY_AUTH_COOKIE, LEGACY_AUTH_VALUE } from '@/lib/auth/constants'

const LEGACY_MAX_AGE = 60 * 60 * 24 * 30

function setLegacyAuthCookie(res: NextResponse) {
  res.cookies.set(LEGACY_AUTH_COOKIE, LEGACY_AUTH_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: LEGACY_MAX_AGE,
    path: '/',
  })
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const cleanEmail = typeof email === 'string' ? email.trim() : ''

  if (cleanEmail) {
    const supabaseConfig = getSupabaseAuthConfig()
    if (!supabaseConfig) {
      return NextResponse.json({ error: 'Supabase Auth is not configured' }, { status: 503 })
    }

    const res = NextResponse.json({ ok: true, auth: 'supabase' })
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const profile = await getActiveUserProfile(data.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Account is inactive or not provisioned' }, { status: 403 })
    }

    res.cookies.delete(LEGACY_AUTH_COOKIE)
    return res
  }

  // Temporary migration fallback. This keeps existing dispatch access working
  // until all admin users have Supabase Auth accounts and active profiles.
  if (password === process.env.DISPATCH_PASSWORD) {
    const res = NextResponse.json({ ok: true, auth: 'legacy' })
    setLegacyAuthCookie(res)
    return res
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
