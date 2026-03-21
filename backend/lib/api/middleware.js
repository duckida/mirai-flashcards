/**
 * Middleware composition for API routes.
 * Provides apiHandler and protectedHandler wrappers that combine
 * CORS, logging, rate limiting, error handling, and auth.
 */

import { withCors, addCorsHeaders } from './cors.js';
import { withLogging, logRequest, logResponse } from './logger.js';
import { rateLimit } from './rateLimit.js';
import { handleApiError } from './errorHandler.js';

/**
 * Create a rate limit middleware instance.
 * 100 requests per minute by default.
 */
const rateLimitMiddleware = rateLimit({ max: 100, windowMs: 60000 });

/**
 * Basic API handler: CORS + logging + error handling.
 * Use for public routes (health checks, auth endpoints).
 */
export function apiHandler(handler) {
  return withCors(async (request, context) => {
    // Apply rate limiting
    const rateLimitResult = rateLimitMiddleware(request);
    if (rateLimitResult) {
      return addCorsHeaders(rateLimitResult);
    }

    // Log the request
    const { requestId, start } = logRequest(request);

    try {
      const response = await handler(request, context);
      logResponse(requestId, start, response.status);
      return response;
    } catch (error) {
      logResponse(requestId, start, 500);
      return addCorsHeaders(handleApiError(error, `API ${request.method} ${new URL(request.url).pathname}`));
    }
  });
}

/**
 * Protected API handler: same as apiHandler but requires authentication.
 * Extracts userId from x-user-id header and passes it as the second argument.
 * Use for routes that require an authenticated user.
 */
export function protectedHandler(handler) {
  return withCors(async (request, context) => {
    // Apply rate limiting
    const rateLimitResult = rateLimitMiddleware(request);
    if (rateLimitResult) {
      return addCorsHeaders(rateLimitResult);
    }

    // Check authentication
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return addCorsHeaders(new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Log the request
    const { requestId, start } = logRequest(request);

    try {
      const response = await handler(request, context, userId);
      logResponse(requestId, start, response.status);
      return response;
    } catch (error) {
      logResponse(requestId, start, 500);
      return addCorsHeaders(handleApiError(error, `API ${request.method} ${new URL(request.url).pathname}`));
    }
  });
}

/**
 * Middleware composition utility.
 * Chains multiple middleware functions around a final handler.
 * Each middleware receives (request, context) and returns a Response or null.
 * If a middleware returns a Response, the chain stops there.
 */
export function withMiddleware(...middlewares) {
  return function (handler) {
    return async (request, context) => {
      for (const mw of middlewares) {
        const result = await mw(request, context);
        if (result instanceof Response) {
          return result;
        }
      }
      return handler(request, context);
    };
  };
}
