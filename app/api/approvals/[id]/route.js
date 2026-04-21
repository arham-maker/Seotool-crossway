import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "../../../../lib/prisma";
import { ROLES } from "../../../../lib/rbac";

export const runtime = "nodejs";

const OPEN_STATUSES = new Set(["pending", "edited"]);

/** PATCH — assignee: approve | decline */
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (session.user.role === ROLES.SUPER_ADMIN) {
      return new Response(JSON.stringify({ error: "Super admins do not use this endpoint." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = await params;
    const body = await req.json();
    const action = String(body.action || "").toLowerCase();

    const approval = await prisma.approval.findUnique({ where: { id } });
    if (!approval) {
      return new Response(JSON.stringify({ error: "Approval not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (approval.assigneeId !== session.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!OPEN_STATUSES.has(approval.status)) {
      return new Response(
        JSON.stringify({ error: "This approval is already closed (approved or declined)." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const now = new Date();

    if (action === "approve") {
      await prisma.approval.update({
        where: { id },
        data: {
          status: "approved",
          lastAction: "approve",
          respondedAt: now,
          awaitingAdminReview: true,
        },
      });
    } else if (action === "decline") {
      await prisma.approval.update({
        where: { id },
        data: {
          status: "declined",
          lastAction: "decline",
          respondedAt: now,
          awaitingAdminReview: true,
        },
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use approve or decline." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updated = await prisma.approval.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        imagePath: true,
        status: true,
        respondedAt: true,
        lastAction: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Response(JSON.stringify({ approval: updated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Failed to update approval" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
