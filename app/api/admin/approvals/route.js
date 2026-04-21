import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { requireSuperAdmin } from "../../../../lib/middleware/auth";
import prisma from "../../../../lib/prisma";
import { ROLES } from "../../../../lib/rbac";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

function extFromMime(mime) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return "";
}

/** GET — list approvals (optional ?countOnly=1 for unread badge) */
export async function GET(req) {
  try {
    await requireSuperAdmin();

    const countOnly = req.nextUrl.searchParams.get("countOnly") === "1";
    if (countOnly) {
      const count = await prisma.approval.count({
        where: { awaitingAdminReview: true },
      });
      return new Response(JSON.stringify({ count }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rows = await prisma.approval.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignee: { select: { id: true, email: true, name: true, role: true } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
    });

    return new Response(JSON.stringify({ approvals: rows }), {
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
    return new Response(JSON.stringify({ error: error.message || "Failed to list approvals" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** POST — multipart: image (file), title, assigneeUserId, optional approveOnAssignment ("1" / "true" / "on") */
export async function POST(req) {
  try {
    const session = await requireSuperAdmin();

    const form = await req.formData();
    const image = form.get("image");
    const title = String(form.get("title") || "").trim();
    const assigneeUserId = String(form.get("assigneeUserId") || "").trim();
    const approveOnAssignmentRaw = form.get("approveOnAssignment");
    const approveOnAssignment =
      approveOnAssignmentRaw === "1" ||
      approveOnAssignmentRaw === "true" ||
      approveOnAssignmentRaw === "on";

    if (!title || title.length > 255) {
      return new Response(JSON.stringify({ error: "Title is required (max 255 characters)." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!assigneeUserId) {
      return new Response(JSON.stringify({ error: "Assignee is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!image || typeof image === "string" || !image.size) {
      return new Response(JSON.stringify({ error: "Image file is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const mime = image.type || "";
    if (!ALLOWED_TYPES.has(mime)) {
      return new Response(
        JSON.stringify({ error: "Invalid image type. Use JPEG, PNG, WebP, or GIF." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (image.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Image must be 5 MB or smaller." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const assignee = await prisma.user.findUnique({
      where: { id: assigneeUserId },
      select: { id: true, role: true },
    });
    if (!assignee) {
      return new Response(JSON.stringify({ error: "Assignee user not found." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (assignee.role === ROLES.SUPER_ADMIN) {
      return new Response(JSON.stringify({ error: "Cannot assign approvals to a Super Admin account." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const buf = Buffer.from(await image.arrayBuffer());
    const ext = extFromMime(mime);
    const fileName = `${crypto.randomBytes(20).toString("hex")}${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "approvals");
    await mkdir(uploadsDir, { recursive: true });
    const diskPath = path.join(uploadsDir, fileName);
    await writeFile(diskPath, buf);

    const imagePath = `/uploads/approvals/${fileName}`;

    const now = new Date();
    const approval = await prisma.approval.create({
      data: {
        title,
        bodyText: "",
        imagePath,
        assigneeId: assigneeUserId,
        createdById: session.user.id,
        status: approveOnAssignment ? "approved" : "pending",
        lastAction: approveOnAssignment ? "approve" : null,
        respondedAt: approveOnAssignment ? now : null,
        awaitingAdminReview: false,
      },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
      },
    });

    if (approveOnAssignment) {
      try {
        await prisma.$executeRaw(
          Prisma.sql`UPDATE approvals SET skipped_assignee_review = 1 WHERE id = ${approval.id}`
        );
      } catch {
        // DB column missing or client mismatch — row still created as approved
      }
    }

    const approvalOut = { ...approval, skippedAssigneeReview: approveOnAssignment };

    return new Response(JSON.stringify({ approval: approvalOut }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error.message === "Unauthorized" || error.message.includes("Super admin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: error.message || "Failed to create approval" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
