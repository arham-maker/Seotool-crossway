import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "../../../../lib/prisma";
import { ROLES } from "../../../../lib/rbac";

export const runtime = "nodejs";

const OPEN_STATUSES = new Set(["pending", "edited"]);

/** PATCH — assignee: approve | decline | edit (text only; image unchanged) */
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
    } else if (action === "edit") {
      const editedText = String(body.editedText ?? "").trim();
      if (!editedText) {
        return new Response(JSON.stringify({ error: "editedText is required for edit action." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (editedText.length > 20000) {
        return new Response(JSON.stringify({ error: "Edited text is too long (max 20000 characters)." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      await prisma.approval.update({
        where: { id },
        data: {
          status: "edited",
          userEditedText: editedText,
          lastAction: "edit",
          respondedAt: now,
          awaitingAdminReview: true,
        },
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use approve, decline, or edit." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updated = await prisma.approval.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        bodyText: true,
        imagePath: true,
        status: true,
        userEditedText: true,
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
