import {
  hashToken,
  getEmailVerificationToken,
  markVerificationTokenAsUsed,
  verifyUserEmail,
  getUserByEmail,
  logVerificationAttempt,
  getSuperAdmins,
} from "../../../../lib/auth";
import { sendAdminVerificationNotification } from "../../../../lib/email";
import { logger } from "../../../../lib/logger";

/**
 * GET /api/auth/verify-email?token=<token>
 * Validates the token, activates the user, and returns status.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawToken = searchParams.get("token");

  if (!rawToken) {
    return new Response(
      JSON.stringify({ error: "Verification token is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const hashedToken = hashToken(rawToken);

    // Look up the token
    const tokenDoc = await getEmailVerificationToken(hashedToken);

    if (!tokenDoc) {
      // Check if it was already used or expired
      const { default: clientPromise } = await import("../../../../lib/db");
      const client = await clientPromise;
      const db = client.db();
      const existingToken = await db
        .collection("email_verification_tokens")
        .findOne({ token: hashedToken });

      let reason = "invalid";
      if (existingToken) {
        if (existingToken.used) {
          reason = "already_used";
        } else if (existingToken.expiresAt < new Date()) {
          reason = "expired";
        }
      }

      await logVerificationAttempt({
        token: hashedToken.substring(0, 12) + "...",
        email: existingToken?.email || "unknown",
        success: false,
        reason,
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      });

      const messages = {
        already_used: "This verification link has already been used. Your account may already be active.",
        expired: "This verification link has expired. Please contact your administrator to resend a new verification email.",
        invalid: "Invalid verification token. Please check the link or contact your administrator.",
      };

      return new Response(
        JSON.stringify({ error: messages[reason], reason }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user is already verified
    const user = await getUserByEmail(tokenDoc.email);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User account not found. It may have been deleted." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (user.emailVerified) {
      // Mark token as used anyway
      await markVerificationTokenAsUsed(hashedToken);

      await logVerificationAttempt({
        token: hashedToken.substring(0, 12) + "...",
        email: tokenDoc.email,
        success: true,
        reason: "already_verified",
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      });

      return new Response(
        JSON.stringify({
          message: "Your email is already verified. You can log in now.",
          alreadyVerified: true,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mark token as used
    await markVerificationTokenAsUsed(hashedToken);

    // Activate the user
    const updatedUser = await verifyUserEmail(tokenDoc.email);

    // Log the successful verification
    await logVerificationAttempt({
      token: hashedToken.substring(0, 12) + "...",
      email: tokenDoc.email,
      userId: user._id.toString(),
      success: true,
      reason: "verified",
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
    });

    logger.info("User email verified and account activated", {
      email: tokenDoc.email,
      userId: user._id.toString(),
    });

    // Notify super admins (fire and forget)
    try {
      const superAdmins = await getSuperAdmins();
      for (const admin of superAdmins) {
        sendAdminVerificationNotification(admin.email, {
          name: user.name,
          email: user.email,
          role: user.role,
        }).catch(() => {}); // Don't await, fire and forget
      }
    } catch (err) {
      logger.warn("Failed to notify admins of verification", { error: err.message });
    }

    return new Response(
      JSON.stringify({
        message: "Email verified successfully! Your account is now active. You can log in.",
        verified: true,
        user: {
          email: updatedUser?.email || tokenDoc.email,
          name: updatedUser?.name || user.name,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("Email verification error", { error: error.message });

    return new Response(
      JSON.stringify({ error: "An error occurred during verification. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
