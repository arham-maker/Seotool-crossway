import { requireAuth } from "../../../lib/middleware/auth";
import { getPageSpeedReport } from "../../../lib/pagespeed";
import { generateReportPdf } from "../../../lib/pdf";
import { saveReport } from "../../../lib/reports";
import { ROLES } from "../../../lib/rbac";
import { isValidUrl, sanitizeString, validateAndNormalizeSiteUrl } from "../../../lib/validation";
import { checkRateLimit, getClientIdentifier } from "../../../lib/rateLimit";
import { logger } from "../../../lib/logger";

// Ensure this route runs in the Node.js runtime (required for pdfkit / googleapis)
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const session = await requireAuth();
    
    // Rate limiting
    const identifier = getClientIdentifier(req, session);
    const rateLimit = checkRateLimit(identifier, "/api/report");
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }
    
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

    const { url: rawUrl } = body ?? {};
    
    // Validate and sanitize URL
    if (!rawUrl || typeof rawUrl !== "string") {
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

    const url = sanitizeString(rawUrl, 2048); // Max URL length

    if (!isValidUrl(url)) {
      return new Response(
        JSON.stringify({
          error: "Invalid URL format. Please provide a valid HTTP or HTTPS URL.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Access control: Regular users can only generate reports for their own siteLink
    const userRole = session.user.role || ROLES.USER;
    if (userRole === ROLES.USER) {
      const userSiteLink = session.user.siteLink;
      if (!userSiteLink) {
        return new Response(
          JSON.stringify({
            error: "No website URL linked to your account. Please contact an administrator.",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      const userSiteValidation = validateAndNormalizeSiteUrl(userSiteLink);
      const requestUrlValidation = validateAndNormalizeSiteUrl(url);
      
      if (!userSiteValidation.valid || !requestUrlValidation.valid) {
        return new Response(
          JSON.stringify({
            error: "Invalid URL format.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      
      if (requestUrlValidation.normalized !== userSiteValidation.normalized) {
        return new Response(
          JSON.stringify({
            error: "Access denied. You can only generate reports for your own website URL.",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    let pagespeedData = null;

    try {
      logger.info("Generating PageSpeed report", { url, userId: session.user.id });
      pagespeedData = await getPageSpeedReport(url);
    } catch (err) {
      logger.error("PageSpeed API error", { 
        error: err.message, 
        url,
        userId: session.user.id 
      });
      
      const errorMessage = err?.message ?? String(err);
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
      
      logger.error("PDF generation error", { 
        error: err.message, 
        url,
        userId: session.user.id 
      });
      
      const errorMessage = err?.message ?? String(err);
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
  } catch (err) {
    logger.error("Report generation error", { 
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
    
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
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing the request.",
        details: process.env.NODE_ENV === "development" ? errorMessage : "Please try again.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

