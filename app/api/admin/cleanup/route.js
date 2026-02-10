import { requireSuperAdmin } from "../../../../lib/middleware/auth";
import { cleanupExpiredPendingUsers } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";

/**
 * POST /api/admin/cleanup
 * Delete pending (unverified) users older than 7 days (Super Admin only)
 */
export async function POST(req) {
  try {
    await requireSuperAdmin();

    const body = await req.json().catch(() => ({}));
    const days = body.days || 7;

    const deletedCount = await cleanupExpiredPendingUsers(days);

    logger.info("Cleaned up expired pending users", { deletedCount, olderThanDays: days });

    return new Response(
      JSON.stringify({
        message: `Cleaned up ${deletedCount} expired pending user(s) older than ${days} days.`,
        deletedCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error.message === "Unauthorized" || error.message.includes("Super admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    logger.error("Cleanup error", { error: error.message });

    return new Response(
      JSON.stringify({ error: error.message || "Cleanup failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
