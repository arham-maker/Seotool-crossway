import { requireAuth } from "../../../lib/middleware/auth";
import { getPageSpeedReport } from "../../../lib/pagespeed";
import { generateReportPdf } from "../../../lib/pdf";
import { saveReport } from "../../../lib/reports";
import { ROLES } from "../../../lib/rbac";

// Ensure this route runs in the Node.js runtime (required for pdfkit / googleapis)
export const runtime = "nodejs";

function isValidUrl(url) {
  try {
    // Throws if invalid
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req) {
  try {
    const session = await requireAuth();
    
    // Viewers cannot create reports
    if (session.user.role === ROLES.VIEWER) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Viewers cannot create reports." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

  const format = req.nextUrl.searchParams.get("format") ?? "pdf";
  const saveToDb = req.nextUrl.searchParams.get("save") !== "false"; // Default to true

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

  const { url } = body ?? {};

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

  let pagespeedData = null;

  try {
    pagespeedData = await getPageSpeedReport(url);
  } catch (err) {
    // Log full error in development, sanitized in production
    const errorMessage = err?.message ?? String(err);
    if (process.env.NODE_ENV === "development") {
      console.error("PageSpeed API error:", err);
    }
    return new Response(
      JSON.stringify({
        error: "Failed to fetch PageSpeed Insights data.",
        details: process.env.NODE_ENV === "development" ? errorMessage : "Please check your API key and try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const report = {
    url,
    generatedAt: new Date().toISOString(),
    pagespeed: pagespeedData,
  };

  if (format === "json") {
    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const pdfBuffer = await generateReportPdf(report);

    // Save report to database if requested
    let reportId = null;
    if (saveToDb) {
      try {
        const savedReport = await saveReport(
          session.user.id,
          url,
          report,
          pdfBuffer
        );
        reportId = savedReport.id;
      } catch (saveErr) {
        // Log but don't fail the request if saving fails
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to save report to database:", saveErr);
        }
      }
    }

    // Wrap Node Buffer in a Uint8Array so it is valid BodyInit
    const pdfArray = new Uint8Array(pdfBuffer);

    return new Response(pdfArray, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="pagespeed-report.pdf"',
        "Content-Length": String(pdfBuffer.length),
        ...(reportId && { "X-Report-Id": reportId }),
      },
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
      console.error("PDF generation error:", err);
    }
    return new Response(
      JSON.stringify({
        error: "Failed to generate PDF report.",
        details: process.env.NODE_ENV === "development" ? errorMessage : "An error occurred while generating the PDF. Please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

