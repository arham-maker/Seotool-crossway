/**
 * Error Handling Utilities
 * Provides consistent error handling and sanitization
 */

import { isProduction } from "./env";
import { logger } from "./logger";

/**
 * Sanitize error message for production
 * @param {Error} error - Error object
 * @returns {string} Sanitized error message
 */
export function sanitizeError(error) {
  if (!error) return "An unexpected error occurred";

  // In production, don't expose internal error details
  if (isProduction()) {
    // Return generic messages for known error types
    if (error.message?.includes("MONGODB_URI") || error.message?.includes("MongoDB") || error.message?.includes("connection")) {
      return "Database connection error. Please try again later.";
    }
    if (error.message?.includes("NEXTAUTH")) {
      return "Authentication configuration error";
    }
    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return error.message; // Security errors are safe to expose
    }
    if (error.message?.includes("validation") || error.message?.includes("Invalid")) {
      return error.message; // Validation errors are safe to expose
    }
    if (error.message?.includes("Email already exists") || error.message?.includes("duplicate")) {
      return "Email already registered";
    }
    
    // Generic error for everything else
    return "An error occurred. Please try again later.";
  }

  // In development, return full error message
  return error.message || "An unexpected error occurred";
}

/**
 * Create a standardized error response
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code
 * @param {string} defaultMessage - Default error message
 * @returns {Response} Error response
 */
export function createErrorResponse(error, statusCode = 500, defaultMessage = "An error occurred") {
  const message = sanitizeError(error);
  
  // Log error for debugging
  logger.error("API Error", {
    message: error?.message,
    stack: isProduction() ? undefined : error?.stack,
    statusCode,
  });

  return new Response(
    JSON.stringify({
      error: message,
      ...(isProduction() ? {} : { details: error?.message, stack: error?.stack }),
    }),
    {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Handle API route errors
 * @param {Error} error - Error object
 * @param {Request} req - Request object
 * @returns {Response} Error response
 */
export function handleApiError(error, req) {
  // Handle specific error types
  if (error.message === "Unauthorized") {
    return createErrorResponse(error, 401, "Unauthorized");
  }

  if (error.message?.includes("Forbidden")) {
    return createErrorResponse(error, 403, "Forbidden");
  }

  if (error.message?.includes("Not Found")) {
    return createErrorResponse(error, 404, "Not Found");
  }

  if (error.message?.includes("validation") || error.message?.includes("Invalid")) {
    return createErrorResponse(error, 400, "Validation Error");
  }

  // Default to 500
  return createErrorResponse(error, 500, "Internal Server Error");
}

