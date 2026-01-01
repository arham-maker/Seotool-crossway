import {
  getPasswordResetToken,
  markTokenAsUsed,
  updateUserPassword,
  hashPassword,
} from "../../../../lib/auth";

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: "Token and password are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const resetToken = await getPasswordResetToken(token);

    if (!resetToken) {
      return new Response(
        JSON.stringify({
          error: "Invalid or expired reset token",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const hashedPassword = await hashPassword(password);
    await updateUserPassword(resetToken.email, hashedPassword);
    await markTokenAsUsed(token);

    return new Response(
      JSON.stringify({ message: "Password reset successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to reset password" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

