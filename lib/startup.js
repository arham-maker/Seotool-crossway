/**
 * Startup Validation
 * Validates environment and configuration on application startup
 */

import { validateEnv } from "./env";
import { logger } from "./logger";

/**
 * Run startup validations
 * Should be called at application startup
 */
export async function validateStartup() {
  try {
    logger.info("Starting application validation...");
    
    // Validate environment variables
    validateEnv();
    
    logger.info("Application validation completed successfully");
    return true;
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    
    // In development, log warning but don't block startup
    if (!isProduction) {
      logger.warn("Startup validation failed (non-blocking in development)", { error: error.message });
      return false;
    }
    
    // In production, throw error to block startup
    logger.error("Startup validation failed", { error: error.message });
    throw error;
  }
}

