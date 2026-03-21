/**
 * Proxy (Middleware for Next.js 16)
 *
 * Handles CORS preflight OPTIONS requests before auth.
 * Protects backend routes from unauthenticated requests.
 * Redirects unauthenticated users to the login page.
 */

import { NextResponse } from 'next/server';
import { authMiddleware } from '@civic/auth/nextjs/middleware';

const ALLOWED_ORIGIN = (process.env.FRONTEND_URL || 'http://localhost:3001').trim().replace(/\/+$/, '');
const ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, x-user-id';

function preflightResponse() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': ALLOWED_METHODS,
      'Access-Control-Allow-Headers': ALLOWED_HEADERS,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export default function middleware(request) {
  if (request.method === 'OPTIONS') {
    return preflightResponse();
  }

  return authMiddleware()(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - Root path "/" (landing page)
     * - _next directory (Next.js static files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Auth API routes
     * - Static assets (images, fonts)
     */
    '/((?!_next|favicon.ico|sitemap.xml|robots.txt|.*\\.jpg|.*\\.png|.*\\.svg|.*\\.gif|api/auth).*)',
  ],
};
