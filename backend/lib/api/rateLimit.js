/**
 * Basic in-memory rate limiter for API routes.
 * Per-user or per-IP sliding window rate limiting.
 * Note: In-memory state resets on Vercel serverless cold starts.
 */

const store = new Map();

/**
 * Clean up expired entries periodically (every 5 minutes).
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get the rate limit key for a request.
 * Uses x-user-id header if present, otherwise IP.
 */
function getRateLimitKey(request) {
  const userId = request.headers.get('x-user-id');
  if (userId) return `rl:user:${userId}`;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return `rl:ip:${forwarded.split(',')[0].trim()}`;

  return 'rl:ip:unknown';
}

/**
 * Check rate limit for a key. Returns { allowed, remaining, resetTime }.
 */
export function checkRateLimit(key, max = 100, windowMs = 60000) {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    resetTime: entry.resetTime,
    limit: max,
  };
}

/**
 * Create a rate limit middleware.
 * @param {Object} options - Rate limit options
 * @param {number} options.max - Maximum requests per window (default: 100)
 * @param {number} options.windowMs - Window duration in ms (default: 60000 = 1 minute)
 */
export function rateLimit({ max = 100, windowMs = 60000 } = {}) {
  return function rateLimitMiddleware(request) {
    const key = getRateLimitKey(request);
    const result = checkRateLimit(key, max, windowMs);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    return null; // Allow request to continue
  };
}
