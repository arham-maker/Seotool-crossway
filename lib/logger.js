/**
 * Structured Logging Utility
 * Provides consistent logging across the application
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLogLevel = process.env.LOG_LEVEL 
  ? LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO
  : process.env.NODE_ENV === "production" 
    ? LOG_LEVELS.INFO 
    : LOG_LEVELS.DEBUG;

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(logEntry);
  }

  // Pretty print in development
  return `[${timestamp}] ${level}: ${message}${Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta, null, 2)}` : ""}`;
}

export const logger = {
  error(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(formatMessage("ERROR", message, meta));
    }
  },

  warn(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(formatMessage("WARN", message, meta));
    }
  },

  info(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(formatMessage("INFO", message, meta));
    }
  },

  debug(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.log(formatMessage("DEBUG", message, meta));
    }
  },
};

