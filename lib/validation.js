/**
 * Input Validation Utilities
 * Provides validation functions for user inputs
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== "string") {
    return { valid: false, errors: ["Password is required"] };
  }

  if (password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  if (password.length > 128) {
    errors.push("Password must be less than 128 characters");
  }

  // Make password requirements less strict - at least 6 characters is enough
  // Optional: Add stronger requirements for better security
  // Uncomment below for stronger password requirements:
  
  // if (!/[a-z]/.test(password)) {
  //   errors.push("Password must contain at least one lowercase letter");
  // }

  // if (!/[A-Z]/.test(password)) {
  //   errors.push("Password must contain at least one uppercase letter");
  // }

  // if (!/[0-9]/.test(password)) {
  //   errors.push("Password must contain at least one number");
  // }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, maxLength = 1000) {
  if (!input || typeof input !== "string") return "";
  return input.trim().slice(0, maxLength);
}

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid
 */
export function isValidObjectId(id) {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Validate and sanitize site URL
 * @param {string} url - URL to validate
 * @returns {{valid: boolean, normalized: string|null, error: string|null}}
 */
export function validateAndNormalizeSiteUrl(url) {
  if (!url || typeof url !== "string") {
    return { valid: false, normalized: null, error: "URL is required" };
  }

  const trimmed = url.trim();

  if (!isValidUrl(trimmed)) {
    return { valid: false, normalized: null, error: "Invalid URL format" };
  }

  try {
    const urlObj = new URL(trimmed);
    // Normalize: remove trailing slash, convert to lowercase hostname
    const normalized = `${urlObj.protocol}//${urlObj.hostname.toLowerCase()}${urlObj.pathname.replace(/\/$/, "")}${urlObj.search}${urlObj.hash}`;
    
    return { valid: true, normalized, error: null };
  } catch {
    return { valid: false, normalized: null, error: "Invalid URL format" };
  }
}

