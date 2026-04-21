import { getServerSession } from "next-auth";
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

    const approvals = await prisma.approval.findMany({
      where: { assigneeId: session.user.id },
      orderBy: { createdAt: "desc" },
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
