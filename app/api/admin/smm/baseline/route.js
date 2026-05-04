import { requireSuperAdmin } from "../../../../../lib/middleware/auth";
import { getUserById } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import { normalizeSiteOrigin } from "../../../../../lib/validation";

function toDateOnly(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0));
}

function getUtcDayRange(date = new Date()) {
  const d = new Date(date);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

function normalizePlatform(value) {
  const p = String(value || "").trim().toLowerCase();
  if (p === "linkedin") return "";
  return p === "x" ? "tiktok" : p;
}

export async function GET(req) {
  try {
    await requireSuperAdmin();
    const userId = req.nextUrl.searchParams.get("userId") || "";
    const siteUrl = req.nextUrl.searchParams.get("siteUrl") || "";
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await getUserById(userId);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalizedSite = normalizeSiteOrigin(siteUrl || user.siteLink || "");
    if (!normalizedSite) {
      return new Response(
        JSON.stringify({
          baselines: [],
          siteUrl: null,
          message: "No integrated site found yet for this user.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const rawRows = await prisma.socialMediaDailyStat.findMany({
      where: {
        userId,
        siteLink: normalizedSite,
      },
      orderBy: [{ statDate: "desc" }, { updatedAt: "desc" }],
    });
    const rows = rawRows.filter((r) => String(r.platform || "").toLowerCase() !== "linkedin");

    const latestByPlatform = new Map();
    for (const row of rows) {
      const key = row.platform === "x" ? "tiktok" : row.platform;
      const existing = latestByPlatform.get(key);
      if (
        !existing ||
        new Date(row.statDate) > new Date(existing.statDate) ||
        (new Date(row.statDate).getTime() === new Date(existing.statDate).getTime() &&
          Number(row.followers || 0) >= Number(existing.followers || 0))
      ) {
        latestByPlatform.set(key, { ...row, platform: key });
      }
    }

    return new Response(
      JSON.stringify({
        siteUrl: normalizedSite,
        baselines: Array.from(latestByPlatform.values()).map((row) => ({
          platform: row.platform,
          accountHandle: row.accountHandle || "",
          followers: Number(row.followers || 0),
        })),
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
    return new Response(
      JSON.stringify({ error: error.message || "Failed to load SMM baseline." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const { userId, siteUrl, baselines } = body || {};

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await getUserById(userId);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalizedSite = normalizeSiteOrigin(siteUrl || user.siteLink || "");
    if (!normalizedSite) {
      return new Response(JSON.stringify({ error: "A valid integrated site URL is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rows = Array.isArray(baselines) ? baselines : [];
    const dedupedByPlatform = new Map();
    rows.forEach((row) => {
      const platform = normalizePlatform(row.platform);
      if (!platform) return;
      dedupedByPlatform.set(platform, row);
    });

    const prepared = Array.from(dedupedByPlatform.values())
      .map((row) => ({
        platform: normalizePlatform(row.platform),
        accountName: String(row.accountName || "").trim() || null,
        accountHandle: String(row.accountHandle || "").trim() || null,
        followers: Number(row.followers || 0),
      }))
      .filter((row) => row.platform);

    if (!prepared.length) {
      return new Response(JSON.stringify({ error: "At least one platform baseline is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const statDate = toDateOnly();
    const { start: dayStart, end: dayEnd } = getUtcDayRange(statDate);
    const platformKeys = prepared.map((row) => row.platform);
    await prisma.$transaction(async (tx) => {
      await tx.socialMediaDailyStat.deleteMany({
        where: {
          userId,
          siteLink: normalizedSite,
          statDate: {
            gte: dayStart,
            lte: dayEnd,
          },
          platform: {
            in: platformKeys,
          },
        },
      });

      await tx.socialMediaDailyStat.createMany({
        data: prepared.map((row) => ({
          userId,
          siteLink: normalizedSite,
          platform: row.platform,
          accountName: row.accountName,
          accountHandle: row.accountHandle,
          statDate,
          followers: row.followers,
          reach: 0,
          engagements: 0,
          queuedPosts: 0,
          queuedReels: 0,
          source: "manual_baseline",
        })),
      });
    });

    return new Response(
      JSON.stringify({
        message: "SMM baseline saved successfully.",
        userId,
        siteUrl: normalizedSite,
        updatedPlatforms: prepared.map((p) => p.platform),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    if (error.message === "Unauthorized" || error.message.includes("Super admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: error.message || "Failed to save SMM baseline." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

