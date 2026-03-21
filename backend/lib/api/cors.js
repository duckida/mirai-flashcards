/**
 * Centralized CORS handling for API routes.
 * Supports multiple allowed origins via comma-separated FRONTEND_URL env var.
 * Handles preflight OPTIONS requests and adds CORS headers to responses.
 */

const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || 'http://localhost:3001')
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''));
const ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, x-user-id';

/**
 * Resolves the allowed origin for a given request.
 * Returns the matching origin if the request's Origin header is in the allowlist,
 * or the first allowed origin as a fallback.
 */
function resolveOrigin(request) {
  const requestOrigin = request?.headers?.get('Origin')?.replace(/\/+$/, '');
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0];
}

/**
 * Returns CORS headers for the given request.
 */
export function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(request),
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Returns a CORS preflight response.
 */
export function preflightResponse(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

/**
 * Adds CORS headers to an existing response.
 */
export function addCorsHeaders(response, request) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(request);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Wrapper that adds CORS headers to all responses from a handler.
 * Automatically handles OPTIONS preflight requests.
 */
export function withCors(handler) {
  return async function corsHandler(request, context) {
    if (request.method === 'OPTIONS') {
      return preflightResponse(request);
    }

    const response = await handler(request, context);
    return addCorsHeaders(response, request);
  };
}
