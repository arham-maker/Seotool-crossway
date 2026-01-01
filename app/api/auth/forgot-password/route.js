import crypto from "crypto";
import { getUserByEmail, createPasswordResetToken } from "../../../../lib/auth";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
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
      console.log("Password reset URL:", resetUrl);
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
    console.error("Forgot password error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

