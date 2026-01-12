import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getAllUsers } from "../../../lib/auth";
import { getSearchConsoleReport } from "../../../lib/searchconsole";
import { ROLES } from "../../../lib/rbac";

// Ensure this route runs in the Node.js runtime
export const runtime = "nodejs";

/**
 * GET /api/dashboard
 * Returns dashboard data based on user role:
 * - Super Admin: All users' websites with statistics
 * - User: Only their own website statistics
 */
export async function GET(req) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const userRole = session.user.role || ROLES.USER;
    const days = parseInt(req.nextUrl.searchParams.get("days") || "30");

    // Super Admin: Get all users' websites
    if (userRole === ROLES.SUPER_ADMIN) {
      const users = await getAllUsers(false); // Only active users
      
      // Fetch statistics for each user's website
      const dashboardData = await Promise.all(
        users
          .filter((user) => user.siteLink) // Only users with site links
          .map(async (user) => {
            try {
              const stats = await getSearchConsoleReport(user.siteLink, days);
              return {
                userId: user.id,
                userName: user.name || user.email,
                userEmail: user.email,
                siteUrl: user.siteLink,
                statistics: {
                  totalClicks: stats.searchAnalytics?.totalClicks || 0,
                  totalImpressions: stats.searchAnalytics?.totalImpressions || 0,
                  averageCtr: stats.searchAnalytics?.averageCtr || 0,
                  averagePosition: stats.searchAnalytics?.averagePosition || 0,
                  verified: stats.siteInfo?.verified || false,
                  sitemapsCount: stats.sitemaps?.sitemaps?.length || 0,
                },
                dateRange: stats.dateRange,
                lastUpdated: stats.generatedAt,
              };
            } catch (error) {
              // If fetching fails, return user info without statistics
              return {
                userId: user.id,
                userName: user.name || user.email,
                userEmail: user.email,
                siteUrl: user.siteLink,
                statistics: null,
                error: error.message || "Failed to fetch statistics",
              };
            }
          })
      );

      return new Response(
        JSON.stringify({
          role: ROLES.SUPER_ADMIN,
          totalUsers: users.length,
          totalWebsites: dashboardData.length,
          websites: dashboardData,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Regular User: Get only their own website statistics
    if (userRole === ROLES.USER) {
      const siteLink = session.user.siteLink;

      if (!siteLink) {
        return new Response(
          JSON.stringify({
            role: ROLES.USER,
            siteUrl: null,
            statistics: null,
            message: "No website URL linked to your account. Please contact an administrator.",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      try {
        const stats = await getSearchConsoleReport(siteLink, days);
        
        return new Response(
          JSON.stringify({
            role: ROLES.USER,
            siteUrl: siteLink,
            statistics: {
              totalClicks: stats.searchAnalytics?.totalClicks || 0,
              totalImpressions: stats.searchAnalytics?.totalImpressions || 0,
              averageCtr: stats.searchAnalytics?.averageCtr || 0,
              averagePosition: stats.searchAnalytics?.averagePosition || 0,
              verified: stats.siteInfo?.verified || false,
              sitemapsCount: stats.sitemaps?.sitemaps?.length || 0,
            },
            dateRange: stats.dateRange,
            lastUpdated: stats.generatedAt,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({
            role: ROLES.USER,
            siteUrl: siteLink,
            statistics: null,
            error: error.message || "Failed to fetch statistics",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Viewer role or other roles
    return new Response(
      JSON.stringify({
        error: "Access denied. Insufficient permissions.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Dashboard API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch dashboard data.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
