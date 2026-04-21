import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from "../../../lib/prisma";
import { ROLES } from "../../../lib/rbac";

export const runtime = "nodejs";

/** GET — approvals assigned to the current user */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (session.user.role === ROLES.SUPER_ADMIN) {
      return new Response(JSON.stringify({ approvals: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const assigneeId = session.user.id;
    const rows = await prisma.approval.findMany({
      where: { assigneeId },
      orderBy: { createdAt: "desc" },
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

    let hiddenIds = new Set();
    try {
      const hiddenRows = await prisma.$queryRaw(
        Prisma.sql`SELECT id FROM approvals WHERE assignee_id = ${assigneeId} AND hidden_from_assignee = 1`
      );
      hiddenIds = new Set(
        Array.isArray(hiddenRows) ? hiddenRows.map((r) => String((r && r.id) || "")).filter(Boolean) : []
      );
    } catch {
      // Column missing or DB mismatch — return all rows for this assignee
    }

    const approvals = rows.filter((a) => !hiddenIds.has(a.id));

    return new Response(JSON.stringify({ approvals }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Failed to load approvals" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
