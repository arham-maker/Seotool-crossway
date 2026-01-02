import { createUser, hashPassword, getUserByEmail } from "../../../../lib/auth";
import { isValidEmail, validatePassword, sanitizeString } from "../../../../lib/validation";
import { checkRateLimit, getClientIdentifier } from "../../../../lib/rateLimit";
import { handleApiError } from "../../../../lib/errors";
import { logger } from "../../../../lib/logger";

export async function POST(req) {
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
    const { email, password, name } = body;

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
    const user = await createUser(email.toLowerCase().trim(), hashedPassword, sanitizedName);

    logger.info("User registered", { userId: user.id, email: user.email });

    return new Response(
      JSON.stringify({ message: "User created successfully", userId: user.id }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("Registration error", { error: error.message });
    return handleApiError(error, req);
  }
}

