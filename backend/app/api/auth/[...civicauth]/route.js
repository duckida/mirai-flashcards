/**
 * Civic Auth Handler
 *
 * Handles all Civic.ai OAuth flows:
 * - Login initiation
 * - OAuth callback
 * - Logout
 * - Session validation
 *
 * Routes:
 * - GET /api/auth/login - Redirect to Civic OAuth
 * - GET /api/auth/callback - Handle OAuth callback
 * - POST /api/auth/logout - Sign out user
 * - GET /api/auth/session - Get current session
 */

import { handler } from '@civic/auth/nextjs';

export const GET = handler();
export const POST = handler();
