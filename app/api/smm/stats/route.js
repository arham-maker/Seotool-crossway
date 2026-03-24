import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import prisma from "../../../../lib/prisma";
import { ROLES } from "../../../../lib/rbac";
import { normalizeSiteOrigin } from "../../../../lib/validation";

export const runtime = "nodejs";

function toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toEndOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getDateRange(range) {
  const end = toEndOfDay(new Date());
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  switch (range) {
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "28d":
      start.setDate(start.getDate() - 27);
      break;
    case "3m":
      start.setMonth(start.getMonth() - 3);
      break;
    case "12m":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 27);
      break;
  }
  return { start, end };
}

function fmtDate(value) {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pctChange(current, previous) {
  const curr = Number(current || 0);
  const prev = Number(previous || 0);
  if (prev <= 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function extractAccountName(accountHandle, fallbackName, fallbackPlatform) {
  const raw = String(accountHandle || "").trim();
  if (raw) {
    if (raw.startsWith("@")) {
      return raw.slice(1).trim();
    }
    try {
      const parsed = new URL(raw);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const first = parts[0] || "";
      if (first.startsWith("@")) return first.slice(1).trim();
      if (first) return first.trim();
    } catch {
      return raw.replace(/^@/, "").trim();
    }
  }
  return String(fallbackName || fallbackPlatform || "").trim();
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const role = session.user.role || ROLES.USER;
    const range = req.nextUrl.searchParams.get("range") || "28d";
    const platform = (req.nextUrl.searchParams.get("platform") || "all").toLowerCase();

    let targetSite = role === ROLES.SUPER_ADMIN
      ? (req.nextUrl.searchParams.get("url") || session.user.siteLink || "")
      : (session.user.siteLink || "");

    targetSite = normalizeSiteOrigin(targetSite);
    if (!targetSite) {
      return new Response(
        JSON.stringify({
          error: "No site selected.",
          setup: {
            message: "Please integrate a site first, then add GTM container ID for tracking.",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (role === ROLES.USER) {
      const ownSite = normalizeSiteOrigin(session.user.siteLink || "");
      if (!ownSite || ownSite !== targetSite) {
        return new Response(JSON.stringify({ error: "Access denied for selected site." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const { start, end } = getDateRange(range);
    const filter = {
      siteLink: targetSite,
      statDate: { gte: start, lte: end },
      ...(platform !== "all" ? { platform } : {}),
    };

    const rows = await prisma.socialMediaDailyStat.findMany({
      where: filter,
      orderBy: [{ statDate: "asc" }, { platform: "asc" }],
    });

    const usersForSite = await prisma.user.findMany({
      where: { siteLink: targetSite },
      select: { id: true, email: true, name: true, gtmContainerId: true },
      orderBy: { createdAt: "asc" },
    });

    const gtmContainerId = usersForSite[0]?.gtmContainerId || null;

    if (!rows.length) {
      return new Response(
        JSON.stringify({
          siteUrl: targetSite,
          range,
          platform,
          summary: {
            totalReach: 0,
            totalEngagements: 0,
            followers: 0,
            queuedPosts: 0,
            queuedReels: 0,
          },
          platformCards: [],
          timeSeries: [],
          accounts: [],
          setup: {
            message: "No SMM stats received yet. Configure GTM and push daily platform metrics to /api/smm/collect.",
            gtmContainerId,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const latestByPlatform = new Map();
    const previousByPlatform = new Map();
    for (const row of rows) {
      const key = row.platform;
      const prev = latestByPlatform.get(key);
      if (!prev || new Date(row.statDate) >= new Date(prev.statDate)) {
        if (prev) previousByPlatform.set(key, prev);
        latestByPlatform.set(key, row);
      }
    }

    const platformCards = Array.from(latestByPlatform.values()).map((row) => {
      const prev = previousByPlatform.get(row.platform);
      const prevFollowers = prev?.followers || 0;
      const deltaFollowers = row.followers - prevFollowers;
      return {
        platform: row.platform,
        accountName: extractAccountName(row.accountHandle, row.accountName, row.platform),
        accountHandle: row.accountHandle || "",
        followers: row.followers,
        deltaFollowers,
        reach: row.reach,
        engagements: row.engagements,
      };
    });

    const byDate = new Map();
    rows.forEach((row) => {
      const key = fmtDate(row.statDate);
      const current = byDate.get(key) || { date: key, reach: 0, engagements: 0 };
      current.reach += row.reach || 0;
      current.engagements += row.engagements || 0;
      byDate.set(key, current);
    });
    const timeSeries = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

    const accounts = Array.from(latestByPlatform.values()).map((row) => {
      const prev = previousByPlatform.get(row.platform);
      return {
        platform: row.platform,
        accountName: extractAccountName(row.accountHandle, row.accountName, row.platform),
        accountHandle: row.accountHandle || "",
        reach: row.reach || 0,
        engagements: row.engagements || 0,
        queuedPosts: row.queuedPosts || 0,
        queuedReels: row.queuedReels || 0,
        followers: row.followers || 0,
        reachChangePct: pctChange(row.reach || 0, prev?.reach || 0),
        engagementsChangePct: pctChange(row.engagements || 0, prev?.engagements || 0),
      };
    });

    const summary = accounts.reduce(
      (acc, row) => {
        acc.totalReach += row.reach;
        acc.totalEngagements += row.engagements;
        acc.followers += row.followers;
        acc.queuedPosts += row.queuedPosts;
        acc.queuedReels += row.queuedReels;
        return acc;
      },
      { totalReach: 0, totalEngagements: 0, followers: 0, queuedPosts: 0, queuedReels: 0 }
    );

    return new Response(
      JSON.stringify({
        siteUrl: targetSite,
        range,
        platform,
        summary,
        platformCards,
        timeSeries,
        accounts,
        setup: {
          gtmContainerId,
          users: usersForSite.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            gtmContainerId: u.gtmContainerId || null,
          })),
        },
        lastUpdated: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch SMM stats." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

