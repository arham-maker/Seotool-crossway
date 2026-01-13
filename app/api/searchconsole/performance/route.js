import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getSearchAnalyticsTimeSeries, getTopQueries } from "../../../../lib/searchconsole";
import { ROLES } from "../../../../lib/rbac";
import { validateAndNormalizeSiteUrl } from "../../../../lib/validation";
import { classifyError, ERROR_TYPES } from "../../../../lib/errorHandling";

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
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return url;
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRange(range) {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case "24h":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "28d":
      startDate.setDate(startDate.getDate() - 28);
      break;
    case "3m":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    default:
      startDate.setDate(startDate.getDate() - 28);
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

/**
 * GET /api/searchconsole/performance
 * Returns Search Console performance data with time-series and top queries
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
    const range = req.nextUrl.searchParams.get("range") || "28d";
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") || "10");

    // Get site URL based on role
    let siteUrl;
    if (userRole === ROLES.SUPER_ADMIN) {
      // Super Admin can specify URL or use their own if available
      siteUrl = req.nextUrl.searchParams.get("url") || session.user.siteLink;
      if (!siteUrl || !isValidUrl(siteUrl)) {
        return new Response(
          JSON.stringify({ 
            error: "Please provide a valid 'url' parameter or ensure your account has a linked website URL." 
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } else {
      // Regular user - use their linked site
      siteUrl = session.user.siteLink;
      if (!siteUrl) {
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
    }

    const normalizedUrl = normalizeSiteUrl(siteUrl);
    const { startDate, endDate } = getDateRange(range);

    // Access control: Regular users can only query their own siteLink
    if (userRole === ROLES.USER) {
      const userSiteValidation = validateAndNormalizeSiteUrl(session.user.siteLink);
      const requestUrlValidation = validateAndNormalizeSiteUrl(normalizedUrl);

      if (!userSiteValidation.valid || !requestUrlValidation.valid) {
        return new Response(
          JSON.stringify({ error: "Invalid URL format." }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (requestUrlValidation.normalized !== userSiteValidation.normalized) {
        return new Response(
          JSON.stringify({
            error: "Access denied. You can only query your own website URL.",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    try {
      // Fetch time-series data and top queries in parallel
      const [timeSeriesData, topQueriesData] = await Promise.all([
        getSearchAnalyticsTimeSeries(normalizedUrl, startDate, endDate),
        getTopQueries(normalizedUrl, startDate, endDate, 1000),
      ]);

      // Paginate top queries
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedQueries = topQueriesData.queries.slice(startIndex, endIndex);

      return new Response(
        JSON.stringify({
          siteUrl: normalizedUrl,
          timeSeries: timeSeriesData.timeSeries,
          totals: timeSeriesData.totals,
          topQueries: {
            queries: paginatedQueries,
            total: topQueriesData.total,
            page,
            pageSize,
            totalPages: Math.ceil(topQueriesData.total / pageSize),
          },
          dateRange: {
            startDate,
            endDate,
            range,
          },
          lastUpdated: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      const errorMessage = err?.message ?? String(err);
      const classifiedError = classifyError(err);
      
      if (process.env.NODE_ENV === "development") {
        console.error("Search Console Performance API error:", err);
      }

      // Determine appropriate HTTP status code
      let statusCode = 500;
      if (classifiedError.type === ERROR_TYPES.MISSING_CREDENTIALS || 
          classifiedError.type === ERROR_TYPES.EXPIRED_TOKEN ||
          classifiedError.type === ERROR_TYPES.INVALID_TOKEN) {
        statusCode = 401;
      } else if (classifiedError.type === ERROR_TYPES.INSUFFICIENT_PERMISSIONS ||
                 classifiedError.type === ERROR_TYPES.PROPERTY_NOT_VERIFIED) {
        statusCode = 403;
      } else if (classifiedError.type === ERROR_TYPES.API_QUOTA_EXCEEDED) {
        statusCode = 429;
      } else if (classifiedError.type === ERROR_TYPES.NETWORK_ERROR ||
                 classifiedError.type === ERROR_TYPES.TIMEOUT_ERROR) {
        statusCode = 503;
      }

      return new Response(
        JSON.stringify({
          error: "Failed to fetch Search Console performance data.",
          errorType: classifiedError.type,
          userMessage: classifiedError.userMessage,
          actionRequired: classifiedError.actionRequired,
          technicalDetails: process.env.NODE_ENV === "development" || userRole === ROLES.SUPER_ADMIN 
            ? classifiedError.technicalDetails 
            : undefined,
          originalError: process.env.NODE_ENV === "development" || userRole === ROLES.SUPER_ADMIN
            ? errorMessage
            : undefined,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    const session = await getServerSession(authOptions).catch(() => null);
    const userRole = session?.user?.role || ROLES.USER;
    
    console.error("Search Console Performance API error:", error);
    const classifiedError = classifyError(error);
    
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing the request.",
        errorType: classifiedError.type,
        userMessage: classifiedError.userMessage,
        actionRequired: classifiedError.actionRequired,
        technicalDetails: process.env.NODE_ENV === "development" || userRole === ROLES.SUPER_ADMIN
          ? classifiedError.technicalDetails
          : undefined,
        originalError: process.env.NODE_ENV === "development" || userRole === ROLES.SUPER_ADMIN
          ? error.message
          : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
