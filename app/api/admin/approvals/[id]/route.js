import { unlink } from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { requireSuperAdmin } from "../../../../../lib/middleware/auth";
import prisma from "../../../../../lib/prisma";

export const runtime = "nodejs";

function publicPathToDisk(publicPath) {
  const rel = String(publicPath || "").replace(/^\/+/, "");
  if (!rel || rel.includes("..")) return null;
  return path.join(process.cwd(), "public", rel);
}

/** PATCH — set hiddenFromAssignee (hide/show for assignee & SMM cards) */
export async function PATCH(req, { params }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();
    if (typeof body.hiddenFromAssignee !== "boolean") {
      return new Response(JSON.stringify({ error: "hiddenFromAssignee (boolean) is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await prisma.approval.findUnique({ where: { id } });
    if (!existing) {
      return new Response(JSON.stringify({ error: "Approval not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await prisma.$executeRaw(
      Prisma.sql`UPDATE approvals SET hidden_from_assignee = ${body.hiddenFromAssignee ? 1 : 0} WHERE id = ${id}`
    );

    return new Response(JSON.stringify({ ok: true, hiddenFromAssignee: body.hiddenFromAssignee }), {
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
    return new Response(JSON.stringify({ error: error.message || "Failed to update approval" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** DELETE — remove approval row and try to remove uploaded image */
export async function DELETE(req, { params }) {
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

    await prisma.approval.delete({ where: { id } });

    const disk = publicPathToDisk(existing.imagePath);
    if (disk) {
      try {
        await unlink(disk);
      } catch {
        // ignore missing file
      }
    }

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
    return new Response(JSON.stringify({ error: error.message || "Failed to delete approval" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
