import { requireSuperAdmin } from "../../../../../../lib/middleware/auth";
import prisma from "../../../../../../lib/prisma";

export const runtime = "nodejs";

/** POST — mark user response as seen (clears awaitingAdminReview) */
export async function POST(req, { params }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const existing = await prisma.approval.findUnique({ where: { id } });
    if (!existing) {
      return new Response(JSON.stringify({ error: "Approval not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await prisma.approval.update({
      where: { id },
      data: { awaitingAdminReview: false },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error.message === "Unauthorized" || error.message.includes("Super admin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: error.message || "Failed to acknowledge" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
