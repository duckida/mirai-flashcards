/**
 * Request logging utilities for API routes.
 * Provides structured JSON logging with request IDs and timing.
 */

let requestIdCounter = 0;

/**
 * Generate a simple unique request ID.
 */
export function generateRequestId() {
  requestIdCounter = (requestIdCounter + 1) % 100000;
  return `req_${Date.now()}_${requestIdCounter}`;
}

/**
 * Extract a client-friendly identifier for the request.
 */
function getClientKey(request) {
  // Prefer x-user-id header, fall back to IP
  const userId = request.headers.get('x-user-id');
  if (userId) return `user:${userId.slice(0, 8)}`;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return `ip:${forwarded.split(',')[0].trim()}`;

  return 'anonymous';
}

/**
 * Log an incoming request. Returns the request ID for downstream use.
 */
export function logRequest(request) {
  const requestId = generateRequestId();
  const start = Date.now();
  const method = request.method;
  const url = new URL(request.url).pathname;
  const client = getClientKey(request);

  console.log(JSON.stringify({
    type: 'request_start',
    requestId,
    method,
    url,
    client,
    timestamp: new Date().toISOString(),
  }));

  return { requestId, start };
}

/**
 * Log a response.
 */
export function logResponse(requestId, start, status) {
  const duration = Date.now() - start;

  console.log(JSON.stringify({
    type: 'request_end',
    requestId,
    status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  }));

  // Warn on slow requests
  if (duration > 5000) {
    console.warn(JSON.stringify({
      type: 'slow_request',
      requestId,
      duration: `${duration}ms`,
      threshold: '5000ms',
    }));
  }

  return duration;
}

/**
 * Wrapper that adds request logging to a handler.
 */
export function withLogging(handler) {
  return async function loggedHandler(request, context) {
    const { requestId, start } = logRequest(request);

    try {
      const response = await handler(request, context);
      logResponse(requestId, start, response.status);
      return response;
    } catch (error) {
      logResponse(requestId, start, 500);
      throw error;
    }
  };
}
