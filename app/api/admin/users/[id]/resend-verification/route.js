import crypto from "crypto";
import { requireSuperAdmin } from "../../../../../../lib/middleware/auth";
import { getUserById, hashToken, createEmailVerificationToken } from "../../../../../../lib/auth";
import { sendVerificationEmail } from "../../../../../../lib/email";
import { logger } from "../../../../../../lib/logger";

/**
 * POST /api/admin/users/[id]/resend-verification
 * Resend the verification email for a pending user (Super Admin only)
 */
export async function POST(req, { params }) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;

    const user = await getUserById(id);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (user.emailVerified === true || user.status === "active") {
      return new Response(
        JSON.stringify({ error: "User is already verified" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate a new verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedTokenValue = hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    // This also invalidates previous tokens for this email
    await createEmailVerificationToken(user.email, hashedTokenValue, expiresAt.toISOString());

    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, user.name || null, rawToken);

    logger.info("Verification email resent by admin", {
      userId: id,
      email: user.email,
      emailSent,
      resentBy: session.user.id,
    });

    if (!emailSent) {
      return new Response(
        JSON.stringify({ error: "Failed to send verification email. Check SMTP configuration." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Verification email resent successfully." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error.message === "Unauthorized" || error.message.includes("Super admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    logger.error("Resend verification error", { error: error.message });

    return new Response(
      JSON.stringify({ error: error.message || "Failed to resend verification email" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
