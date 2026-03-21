/**
 * Centralized CORS handling for API routes.
 * Handles preflight OPTIONS requests and adds CORS headers to responses.
 */

const ALLOWED_ORIGIN = (process.env.FRONTEND_URL || 'http://localhost:3001').trim().replace(/\/+$/, '');
const ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, x-user-id';

/**
 * Returns CORS headers for the given request.
 */
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Returns a CORS preflight response.
 */
export function preflightResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

/**
 * Adds CORS headers to an existing response.
 */
export function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders();
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
      return preflightResponse();
    }

    const response = await handler(request, context);
    return addCorsHeaders(response);
  };
}
