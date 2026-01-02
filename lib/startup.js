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
    logger.error("Startup validation failed", { error: error.message });
    throw error;
  }
}

