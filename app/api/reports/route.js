import { requireAuth, getAccessibleSites } from "../../../lib/middleware/auth";
import { getUserReports } from "../../../lib/reports";
import { isSuperAdmin, ROLES } from "../../../lib/rbac";
import clientPromise from "../../../lib/db";

export async function GET() {
  try {
    const session = await requireAuth();
    
    // Super admin can see all reports
    if (isSuperAdmin(session.user.role)) {
      const client = await clientPromise;
      const db = client.db();
      const reportsCollection = db.collection("reports");
      
      const reports = await reportsCollection
        .find(
          {},
          {
            projection: {
              pdfBuffer: 0, // Exclude PDF buffer from list view
            },
          }
        )
        .sort({ generatedAt: -1 })
        .toArray();
      
      return new Response(
        JSON.stringify({
          reports: reports.map((report) => ({
            id: report._id.toString(),
            userId: report.userId,
            url: report.url,
            performanceScore: report.performanceScore,
            seoScore: report.seoScore,
            accessibilityScore: report.accessibilityScore,
            generatedAt: report.generatedAt,
          })),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Regular users and viewers can only see their own reports
    const reports = await getUserReports(session.user.id);
    return new Response(JSON.stringify({ reports }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    const errorMessage = err?.message ?? String(err);
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to fetch reports:", err);
    }
    return new Response(
      JSON.stringify({
        error: "Failed to fetch reports.",
        details: process.env.NODE_ENV === "development" ? errorMessage : "An error occurred while fetching reports.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

