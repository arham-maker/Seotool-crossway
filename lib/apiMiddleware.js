/**
 * API Middleware Utilities
 * Common middleware functions for API routes
 */

import { checkRateLimit, getClientIdentifier } from "./rateLimit";
import { handleApiError } from "./errors";
import { logger } from "./logger";

/**
 * Wrapper for API routes with rate limiting and error handling
 * @param {Function} handler - API route handler
 * @param {Object} options - Middleware options
 * @returns {Function} Wrapped handler
 */
export function withApiMiddleware(handler, options = {}) {
  const {
    rateLimitPath = null,
    requireAuth = false,
    maxBodySize = 1024 * 1024, // 1MB default
  } = options;

  return async (req, context) => {
    try {
      // Rate limiting
      if (rateLimitPath) {
        const identifier = getClientIdentifier(req);
        const rateLimit = checkRateLimit(identifier, rateLimitPath);

        if (!rateLimit.allowed) {
          return new Response(
            JSON.stringify({
              error: "Too many requests. Please try again later.",
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
                "X-RateLimit-Limit": String(rateLimit.resetAt),
                "X-RateLimit-Remaining": String(rateLimit.remaining),
                "X-RateLimit-Reset": String(rateLimit.resetAt),
              },
            }
          );
        }
      }

      // Check request body size
      const contentLength = req.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > maxBodySize) {
        return new Response(
          JSON.stringify({
            error: "Request body too large",
          }),
          {
            status: 413,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Call the handler
      return await handler(req, context);
    } catch (error) {
      logger.error("API middleware error", {
        path: req.url,
        method: req.method,
        error: error.message,
      });
      return handleApiError(error, req);
    }
  };
}

/**
 * Validate request method
 * @param {Request} req - Request object
 * @param {string[]} allowedMethods - Allowed HTTP methods
 * @returns {Response|null} Error response if invalid, null if valid
 */
export function validateMethod(req, allowedMethods) {
  if (!allowedMethods.includes(req.method)) {
    return new Response(
      JSON.stringify({
        error: `Method ${req.method} not allowed`,
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Allow": allowedMethods.join(", "),
        },
      }
    );
  }
  return null;
}

