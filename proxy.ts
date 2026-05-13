import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'dispatch_auth'
const AUTH_VALUE = 'authenticated'
const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
])

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function isCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/cron/')) {
    return isCronAuthorized(request) ? NextResponse.next() : unauthorized()
  }

  const auth = request.cookies.get(AUTH_COOKIE)
  if (auth?.value !== AUTH_VALUE) {
    return unauthorized()
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
