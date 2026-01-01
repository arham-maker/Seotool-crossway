import { getServerSession } from "next-auth";
import { getUserReports } from "../../../lib/reports";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
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

  try {
    const reports = await getUserReports(session.user.id);
    return new Response(JSON.stringify({ reports }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
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

