/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 */

const isProdEnv = process.env.NODE_ENV === "production";

const requiredEnvVars = {
  MONGODB_URI: {
    required: true,
    description: "MongoDB connection string",
  },
  NEXTAUTH_SECRET: {
    required: isProdEnv, // Only required in production
    description: "NextAuth secret for JWT signing",
    minLength: 32,
  },
  NEXTAUTH_URL: {
    required: isProdEnv,
    description: "NextAuth URL (required in production)",
  },
  PAGESPEED_API_KEY: {
    required: isProdEnv, // Only required in production
    description: "Google PageSpeed Insights API key",
  },
};

const optionalEnvVars = {
  GOOGLE_APPLICATION_CREDENTIALS_JSON: {
    description: "Google service account credentials (optional)",
  },
  GA_PROPERTY_PREFIX: {
    description: "Google Analytics property prefix (optional)",
    default: "properties/",
  },
  NODE_ENV: {
    description: "Node environment",
    default: "development",
  },
};

/**
 * Validate environment variables
 * @throws {Error} If required variables are missing or invalid
 */
export function validateEnv() {
  const errors = [];
  const warnings = [];

  // Check required variables
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];

    if (config.required && !value) {
      errors.push(`Missing required environment variable: ${key} (${config.description})`);
      continue;
    }

    if (value && config.minLength && value.length < config.minLength) {
      errors.push(
        `Invalid environment variable: ${key} must be at least ${config.minLength} characters`
      );
    }

    // Security checks (only in production)
    if (isProdEnv && key === "NEXTAUTH_SECRET" && value === "your-secret-key-change-in-production") {
      errors.push(
        "NEXTAUTH_SECRET must be changed from the default value in production"
      );
    }
  }

  // Check optional variables and set defaults
  for (const [key, config] of Object.entries(optionalEnvVars)) {
    if (!process.env[key] && config.default) {
      process.env[key] = config.default;
    }
  }

  // Production-specific checks
  if (isProdEnv) {
    if (!process.env.NEXTAUTH_URL) {
      errors.push("NEXTAUTH_URL is required in production");
    }

    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith("https://")) {
      warnings.push("NEXTAUTH_URL should use HTTPS in production");
    }

    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes("mongodb+srv://") && 
        !process.env.MONGODB_URI.includes("mongodb://")) {
      warnings.push("MONGODB_URI format may be invalid");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
  }

  if (warnings.length > 0 && process.env.NODE_ENV === "production") {
    console.warn("Environment warnings:\n" + warnings.join("\n"));
  }

  return true;
}

/**
 * Get environment variable with validation
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Environment variable value
 */
export function getEnv(key, defaultValue = null) {
  const value = process.env[key];
  if (!value && defaultValue === null) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value || defaultValue;
}

/**
 * Check if running in production
 * @returns {boolean}
 */
export function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development
 * @returns {boolean}
 */
export function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

