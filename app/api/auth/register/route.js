import crypto from "crypto";
import { createUser, hashPassword, getUserByEmail, hashToken, createEmailVerificationToken } from "../../../../lib/auth";
import { isValidEmail, validatePassword, sanitizeString } from "../../../../lib/validation";
import { checkRateLimit, getClientIdentifier } from "../../../../lib/rateLimit";
import { handleApiError } from "../../../../lib/errors";
import { sendVerificationEmail } from "../../../../lib/email";
import { logger } from "../../../../lib/logger";

export async function POST(req) {
  let email = null; // Declare outside try block for error handling
  
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimit = checkRateLimit(identifier, "/api/auth/register");

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many registration attempts. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await req.json();
    const parsedData = body || {};
    email = parsedData.email;
    const { password, name } = parsedData;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({
          error: "Password does not meet requirements",
          details: passwordValidation.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Sanitize name
    const sanitizedName = name ? sanitizeString(name, 100) : null;

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const hashedPassword = await hashPassword(password);
    const normalizedEmail = email.toLowerCase().trim();
    const user = await createUser(normalizedEmail, hashedPassword, sanitizedName);

    // Generate verification token and send email
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedTokenValue = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await createEmailVerificationToken(normalizedEmail, hashedTokenValue, expiresAt.toISOString());
    const emailSent = await sendVerificationEmail(normalizedEmail, sanitizedName, rawToken);

    logger.info("User registered, verification email sent", {
      userId: user.id,
      email: user.email,
      emailSent,
    });

    return new Response(
      JSON.stringify({
        message: "Registration successful! Please check your email to verify your account.",
        userId: user.id,
        emailSent,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Enhanced error logging for debugging
    logger.error("Registration error", {
      error: error.message,
      stack: error.stack,
      email: email ? email.substring(0, 3) + "***" : "unknown",
      hasEmail: !!email,
    });

    // Check for specific error types and provide better messages
    if (error.message?.includes("bad auth") || error.message?.includes("Authentication failed")) {
      return new Response(
        JSON.stringify({
          error: "Database authentication failed. Please check your MongoDB credentials.",
          ...(process.env.NODE_ENV === "development" && { 
            details: "Verify MONGODB_URI username and password are correct. Special characters in password must be URL-encoded." 
          })
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    if (error.message?.includes("MongoDB") || error.message?.includes("MONGODB") || error.message?.includes("connection") || error.message?.includes("timeout")) {
      return new Response(
        JSON.stringify({
          error: "Database connection error. Please try again later.",
          ...(process.env.NODE_ENV === "development" && { details: error.message })
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error.message?.includes("Email already exists") || error.message?.includes("duplicate")) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Use handleApiError for other errors
    return handleApiError(error, req);
  }
}

