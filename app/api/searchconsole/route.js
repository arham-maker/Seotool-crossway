import { getServerSession } from "next-auth";
import { getSearchConsoleReport } from "../../../lib/searchconsole";
import { authOptions } from "../auth/[...nextauth]/route";

// Ensure this route runs in the Node.js runtime
export const runtime = "nodejs";

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function normalizeSiteUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash and ensure proper format
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return url;
  }
}

export async function POST(req) {
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

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body in request." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { url, days } = body ?? {};

  if (!url || typeof url !== "string" || !isValidUrl(url)) {
    return new Response(
      JSON.stringify({
        error: "Invalid or missing 'url'. Please provide a fully-qualified URL.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const normalizedUrl = normalizeSiteUrl(url);
  const daysToFetch = days && typeof days === "number" ? Math.min(Math.max(days, 1), 90) : 30;

  try {
    const report = await getSearchConsoleReport(normalizedUrl, daysToFetch);

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = err?.message ?? String(err);
    if (process.env.NODE_ENV === "development") {
      console.error("Search Console API error:", err);
    }
    return new Response(
      JSON.stringify({
        error: "Failed to fetch Search Console data.",
        details: process.env.NODE_ENV === "development" ? errorMessage : "Please check your Search Console configuration and ensure the site is verified.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

