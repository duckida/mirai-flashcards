/**
 * Proxy (Middleware for Next.js 16)
 *
 * Protects backend routes from unauthenticated requests.
 * Redirects unauthenticated users to the login page.
 */

import { authMiddleware } from '@civic/auth/nextjs/middleware';

export default authMiddleware();

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
