import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isCronAuthorized, requireApiAuth, unauthorized } from '@/lib/auth/proxy'

const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/cron/')) {
    return isCronAuthorized(request) ? NextResponse.next() : unauthorized()
  }

  return requireApiAuth(request)
}

export const config = {
  matcher: '/api/:path*',
}
