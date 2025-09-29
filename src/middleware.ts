import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/auth/callback']

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Check for auth token in cookies
  const token = request.cookies.get('sb-access-token')

  // If no token and trying to access protected route, redirect to login
  if (!token && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Root route logic
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/feed', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
