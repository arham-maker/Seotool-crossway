/**
 * Simple In-Memory Rate Limiting
 * For production, consider using Redis or a dedicated rate limiting service
 */

const rateLimitStore = new Map();

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
  // API routes
  "/api/report": { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  "/api/reports": { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  "/api/admin": { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  "/api/auth/login": { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  "/api/auth/register": { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour
  "/api/auth/forgot-password": { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour
  "/api/auth/verify-email": { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
  "/api/admin/users": { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute (includes resend)
  default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
};

/**
 * Clean up old entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.expiresAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

/**
 * Check rate limit for a request
 * @param {string} identifier - Unique identifier (IP address, user ID, etc.)
 * @param {string} path - Request path
 * @returns {{allowed: boolean, remaining: number, resetAt: number}}
 */
export function checkRateLimit(identifier, path) {
  // Find matching rate limit config
  let config = RATE_LIMITS.default;
  for (const [route, limit] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(route)) {
      config = limit;
      break;
    }
  }

  const key = `${identifier}:${path}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.expiresAt < now) {
    // Create new record
    rateLimitStore.set(key, {
      count: 1,
      expiresAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.expiresAt,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.expiresAt,
  };
}

/**
 * Get client identifier from request
 * @param {Request} req - Request object
 * @param {Object} session - User session (optional)
 * @returns {string} Client identifier
 */
export function getClientIdentifier(req, session = null) {
  // Use user ID if authenticated, otherwise use IP
  if (session?.user?.id) {
    return `user:${session.user.id}`;
  }

  // Get IP address from headers
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  return `ip:${ip}`;
}

