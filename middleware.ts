import { auth } from '@/lib/auth/config'
import { NextResponse } from 'next/server'
import { checkRateLimit, getBucket, rateLimitResponse } from '@/lib/middleware/rate-limit'
import {
  applySecurityHeaders,
  handlePreflight,
  validateContentType,
  validateRequestSize,
  handleCors,
} from '@/lib/middleware/security'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Handle CORS preflight
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  // ------------------------------------------------------------------
  // Rate limiting (API routes only)
  // ------------------------------------------------------------------
  const bucket = getBucket(pathname)
  if (bucket) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1'

    const result = checkRateLimit(ip, bucket)
    if (!result.allowed) {
      return rateLimitResponse(result)
    }
  }

  // ------------------------------------------------------------------
  // Security checks for API mutation requests
  // ------------------------------------------------------------------
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const sizeError = validateRequestSize(req)
    if (sizeError) return sizeError

    const contentTypeError = validateContentType(req)
    if (contentTypeError) return contentTypeError
  }

  // ------------------------------------------------------------------
  // Authentication guards
  // ------------------------------------------------------------------
  const isAuthApi = pathname.startsWith('/api/auth')

  if (isAuthApi) {
    const response = NextResponse.next()
    return applySecurityHeaders(handleCors(req, response))
  }

  if (pathname.startsWith('/dashboard') && !isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl))
  }

  if (pathname.startsWith('/onboarding') && !isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl))
  }

  if (pathname.startsWith('/api/') && !isLoggedIn) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ------------------------------------------------------------------
  // Apply security headers + CORS to all matched routes
  // ------------------------------------------------------------------
  const response = NextResponse.next()
  return applySecurityHeaders(handleCors(req, response))
})

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/api/:path*'],
}
