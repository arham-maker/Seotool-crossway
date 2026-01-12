import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getPageSpeedReport } from "../../../lib/pagespeed";
import { getAllUsers } from "../../../lib/auth";
import { ROLES } from "../../../lib/rbac";

// Ensure this route runs in the Node.js runtime
export const runtime = "nodejs";

/**
 * GET /api/pagespeed
 * Returns PageSpeed Insights data based on user role:
 * - Super Admin: All users' websites PageSpeed data
 * - User: Only their own website PageSpeed data
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

    // Super Admin: Get all users' websites PageSpeed data
    if (userRole === ROLES.SUPER_ADMIN) {
      const users = await getAllUsers(false); // Only active users
      
      // Fetch PageSpeed data for each user's website
      const pagespeedData = await Promise.all(
        users
          .filter((user) => user.siteLink) // Only users with site links
          .map(async (user) => {
            try {
              const pagespeed = await getPageSpeedReport(user.siteLink);
              return {
                userId: user.id,
                userName: user.name || user.email,
                userEmail: user.email,
                siteUrl: user.siteLink,
                pagespeed: {
                  performanceScore: pagespeed.performanceScore,
                  seoScore: pagespeed.seoScore,
                  accessibilityScore: pagespeed.accessibilityScore,
                  bestPracticesScore: pagespeed.bestPracticesScore,
                  fetchTime: pagespeed.fetchTime,
                },
              };
            } catch (error) {
              // If fetching fails, return user info without PageSpeed data
              return {
                userId: user.id,
                userName: user.name || user.email,
                userEmail: user.email,
                siteUrl: user.siteLink,
                pagespeed: null,
                error: error.message || "Failed to fetch PageSpeed data",
              };
            }
          })
      );

      return new Response(
        JSON.stringify({
          role: ROLES.SUPER_ADMIN,
          totalUsers: users.length,
          totalWebsites: pagespeedData.length,
          websites: pagespeedData,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Regular User: Get only their own website PageSpeed data
    if (userRole === ROLES.USER) {
      const siteLink = session.user.siteLink;

      if (!siteLink) {
        return new Response(
          JSON.stringify({
            role: ROLES.USER,
            siteUrl: null,
            pagespeed: null,
            message: "No website URL linked to your account. Please contact an administrator.",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      try {
        const pagespeed = await getPageSpeedReport(siteLink);
        
        return new Response(
          JSON.stringify({
            role: ROLES.USER,
            siteUrl: siteLink,
            pagespeed: {
              performanceScore: pagespeed.performanceScore,
              seoScore: pagespeed.seoScore,
              accessibilityScore: pagespeed.accessibilityScore,
              bestPracticesScore: pagespeed.bestPracticesScore,
              fetchTime: pagespeed.fetchTime,
              metrics: pagespeed.metrics,
            },
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
            pagespeed: null,
            error: error.message || "Failed to fetch PageSpeed data",
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
    console.error("PageSpeed API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch PageSpeed data.",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
