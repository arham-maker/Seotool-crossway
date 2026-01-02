import crypto from "crypto";
import { getUserByEmail, createPasswordResetToken } from "../../../../lib/auth";
import { isValidEmail } from "../../../../lib/validation";
import { checkRateLimit, getClientIdentifier } from "../../../../lib/rateLimit";
import { handleApiError } from "../../../../lib/errors";
import { logger } from "../../../../lib/logger";

export async function POST(req) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimit = checkRateLimit(identifier, "/api/auth/forgot-password");
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          message: "If the email exists, a password reset link has been sent.",
        }),
        {
          status: 200, // Don't reveal rate limit to prevent email enumeration
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const { email } = await req.json();

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      return new Response(
        JSON.stringify({
          message: "If the email exists, a password reset link has been sent.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    await createPasswordResetToken(email, token, expiresAt.toISOString());

    // In production, send email here
    // For now, we'll return the token in development
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    // Log reset URL in development only
    if (process.env.NODE_ENV === "development") {
      logger.debug("Password reset URL", { resetUrl });
    } else {
      // In production, send email here
      // TODO: Implement email sending service (SendGrid, Resend, etc.)
      logger.info("Password reset requested", { email: user.email });
    }

    return new Response(
      JSON.stringify({
        message: "If the email exists, a password reset link has been sent.",
        // Remove this in production - only for development
        ...(process.env.NODE_ENV === "development" && { resetUrl }),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("Forgot password error", { error: error.message });
    return handleApiError(error, req);
  }
}

