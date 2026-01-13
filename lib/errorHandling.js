/**
 * Error handling utilities for Google Search Console API
 * Classifies errors and provides user-friendly messages
 */

export const ERROR_TYPES = {
  MISSING_CREDENTIALS: "MISSING_CREDENTIALS",
  EXPIRED_TOKEN: "EXPIRED_TOKEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  PROPERTY_NOT_VERIFIED: "PROPERTY_NOT_VERIFIED",
  API_QUOTA_EXCEEDED: "API_QUOTA_EXCEEDED",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",
  INVALID_URL: "INVALID_URL",
  NO_SITE_LINKED: "NO_SITE_LINKED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Classify an error based on its message and properties
 * @param {Error|string} error - The error object or message
 * @returns {Object} - { type, message, userMessage, actionRequired }
 */
export function classifyError(error) {
  const errorMessage = typeof error === "string" ? error : error?.message || String(error);
  const errorCode = error?.code || error?.status || error?.response?.status;

  // Missing or invalid credentials
  if (
    errorMessage.includes("GOOGLE_APPLICATION_CREDENTIALS_JSON") ||
    errorMessage.includes("credentials") ||
    errorMessage.includes("authentication")
  ) {
    return {
      type: ERROR_TYPES.MISSING_CREDENTIALS,
      message: errorMessage,
      userMessage: "Google Search Console credentials are not configured or invalid.",
      actionRequired: "Please check your .env.local file and ensure GOOGLE_APPLICATION_CREDENTIALS_JSON is set correctly.",
      technicalDetails: errorMessage,
    };
  }

  // Expired or invalid token
  if (
    errorMessage.includes("invalid_grant") ||
    errorMessage.includes("JWT") ||
    errorMessage.includes("token") ||
    errorMessage.includes("expired") ||
    errorCode === 401
  ) {
    return {
      type: ERROR_TYPES.EXPIRED_TOKEN,
      message: errorMessage,
      userMessage: "Authentication token has expired or is invalid.",
      actionRequired: "Please sync your system clock and restart the server. If the issue persists, verify your service account credentials.",
      technicalDetails: errorMessage,
    };
  }

  // Insufficient permissions
  if (
    errorMessage.includes("Access denied") ||
    errorMessage.includes("403") ||
    errorMessage.includes("permission") ||
    errorMessage.includes("Forbidden") ||
    errorCode === 403
  ) {
    return {
      type: ERROR_TYPES.INSUFFICIENT_PERMISSIONS,
      message: errorMessage,
      userMessage: "Access denied. Insufficient permissions to access Search Console data.",
      actionRequired: "Please ensure the service account is added to Google Search Console with 'Full' access for this website property.",
      technicalDetails: errorMessage,
    };
  }

  // Property not verified
  if (
    errorMessage.includes("not verified") ||
    errorMessage.includes("verification") ||
    errorMessage.includes("Site verification status unknown") ||
    errorMessage.includes("siteUrl") ||
    errorCode === 404
  ) {
    return {
      type: ERROR_TYPES.PROPERTY_NOT_VERIFIED,
      message: errorMessage,
      userMessage: "Website property is not verified in Google Search Console.",
      actionRequired: "Please verify your website in Google Search Console and ensure the service account has access to it.",
      technicalDetails: errorMessage,
    };
  }

  // API quota exceeded
  if (
    errorMessage.includes("quota") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("429") ||
    errorCode === 429
  ) {
    return {
      type: ERROR_TYPES.API_QUOTA_EXCEEDED,
      message: errorMessage,
      userMessage: "API quota limit has been exceeded.",
      actionRequired: "Please wait a few minutes before trying again, or check your Google Cloud Console API quotas.",
      technicalDetails: errorMessage,
    };
  }

  // Network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("ENOTFOUND") ||
    errorMessage.includes("ETIMEDOUT") ||
    error?.code === "ECONNREFUSED" ||
    error?.code === "ENOTFOUND" ||
    error?.code === "ETIMEDOUT"
  ) {
    return {
      type: ERROR_TYPES.NETWORK_ERROR,
      message: errorMessage,
      userMessage: "Network connection error. Unable to reach Google Search Console API.",
      actionRequired: "Please check your internet connection and try again.",
      technicalDetails: errorMessage,
    };
  }

  // Timeout errors
  if (
    errorMessage.includes("timeout") ||
    errorMessage.includes("TIMEOUT") ||
    error?.code === "ETIMEDOUT"
  ) {
    return {
      type: ERROR_TYPES.TIMEOUT_ERROR,
      message: errorMessage,
      userMessage: "Request timed out while fetching Search Console data.",
      actionRequired: "Please try again. If the issue persists, the API may be experiencing high load.",
      technicalDetails: errorMessage,
    };
  }

  // Invalid URL
  if (
    errorMessage.includes("Invalid URL") ||
    errorMessage.includes("invalid url") ||
    errorMessage.includes("URL format")
  ) {
    return {
      type: ERROR_TYPES.INVALID_URL,
      message: errorMessage,
      userMessage: "The website URL is invalid or incorrectly formatted.",
      actionRequired: "Please contact an administrator to update your website URL.",
      technicalDetails: errorMessage,
    };
  }

  // No site linked
  if (
    errorMessage.includes("No website URL") ||
    errorMessage.includes("No site") ||
    errorMessage.includes("siteLink")
  ) {
    return {
      type: ERROR_TYPES.NO_SITE_LINKED,
      message: errorMessage,
      userMessage: "No website URL is linked to your account.",
      actionRequired: "Please contact an administrator to link a website URL to your account.",
      technicalDetails: errorMessage,
    };
  }

  // Unknown error
  return {
    type: ERROR_TYPES.UNKNOWN_ERROR,
    message: errorMessage,
    userMessage: "An unexpected error occurred while fetching Search Console data.",
    actionRequired: "Please try again later. If the issue persists, contact support.",
    technicalDetails: errorMessage,
  };
}

/**
 * Get connection status based on error type
 * @param {string} errorType - The classified error type
 * @returns {Object} - { status, label, color }
 */
export function getConnectionStatus(errorType) {
  if (!errorType) {
    return {
      status: "connected",
      label: "Connected",
      color: "green",
      icon: "check",
    };
  }

  switch (errorType) {
    case ERROR_TYPES.MISSING_CREDENTIALS:
    case ERROR_TYPES.EXPIRED_TOKEN:
    case ERROR_TYPES.INVALID_TOKEN:
      return {
        status: "not_connected",
        label: "Not Connected",
        color: "red",
        icon: "x",
      };
    case ERROR_TYPES.INSUFFICIENT_PERMISSIONS:
    case ERROR_TYPES.PROPERTY_NOT_VERIFIED:
      return {
        status: "permission_error",
        label: "Permission Error",
        color: "orange",
        icon: "alert",
      };
    case ERROR_TYPES.API_QUOTA_EXCEEDED:
    case ERROR_TYPES.NETWORK_ERROR:
    case ERROR_TYPES.TIMEOUT_ERROR:
      return {
        status: "temporary_error",
        label: "Temporary Error",
        color: "yellow",
        icon: "clock",
      };
    default:
      return {
        status: "error",
        label: "Error",
        color: "red",
        icon: "alert",
      };
  }
}

/**
 * Format error message for display based on user role
 * @param {Object} classifiedError - The classified error object
 * @param {boolean} isSuperAdmin - Whether the user is a super admin
 * @returns {string} - Formatted error message
 */
export function formatErrorMessage(classifiedError, isSuperAdmin = false) {
  if (isSuperAdmin) {
    return `${classifiedError.userMessage} ${classifiedError.actionRequired} Technical details: ${classifiedError.technicalDetails}`;
  }
  return `${classifiedError.userMessage} ${classifiedError.actionRequired}`;
}
