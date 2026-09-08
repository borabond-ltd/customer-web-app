import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Pages that don't require onboarding completion
const ALLOWED_PATHS = [
  '/onboarding',
  '/complete-profile',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/dashboard/notifications',
  '/dashboard/investment/monthly-deposits', // Allow monthly deposits page without onboarding completion
  '/api',
  '/_next',
  '/favicon.ico',
  '/public',
  '/get-app',
  '/.well-known',
]

// Pages that require authentication but not onboarding
const AUTH_REQUIRED_PATHS = [
  '/dashboard',
  '/bonds',
  '/investments',
  '/profile',
  '/settings',
  '/bank-linking'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if path is in allowed paths (no onboarding required)
  const isAllowedPath = ALLOWED_PATHS.some(path => pathname.startsWith(path))
  
  if (isAllowedPath) {
    return NextResponse.next()
  }

  // For protected routes, we'll let the client-side OnboardingGuard handle the logic
  // This middleware just ensures the route exists and passes through
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}