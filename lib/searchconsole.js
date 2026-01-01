import { google } from "googleapis";
import { JWT } from "google-auth-library";
import { resolve } from "path";
import { readFileSync } from "fs";

let searchConsoleClient = null;

/**
 * Get or create Google Search Console API client
 * Uses service account authentication similar to Analytics
 */
async function getSearchConsoleClient() {
  if (searchConsoleClient) return searchConsoleClient;

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS_JSON is not set. Search Console will not work."
    );
  }

  let credentials;
  try {
    // Check if it's inline JSON
    if (typeof credentialsJson === "string" && credentialsJson.startsWith("{")) {
      credentials = JSON.parse(credentialsJson);
    } else {
      // It's a file path - resolve it relative to project root
      let filePath;
      
      // Trim any whitespace from the path
      const trimmedPath = credentialsJson.trim();
      
      // If it's already an absolute path (starts with drive letter or /)
      if (trimmedPath.match(/^[A-Za-z]:/) || trimmedPath.startsWith("/")) {
        filePath = trimmedPath;
      } else {
        // Remove leading ./ if present
        const cleanPath = trimmedPath.startsWith("./") 
          ? trimmedPath.substring(2) 
          : trimmedPath;
        
        // Resolve from process.cwd() (project root in Next.js)
        filePath = resolve(process.cwd(), cleanPath);
      }
      
      // Normalize the path to handle any issues
      filePath = resolve(filePath);
      
      // Read and parse the file
      const fileContent = readFileSync(filePath, "utf8");
      credentials = JSON.parse(fileContent);
    }
  } catch (err) {
    // Provide more detailed error message with the actual values
    const attemptedPath = credentialsJson.startsWith("{") 
      ? "inline JSON" 
      : (credentialsJson.match(/^[A-Za-z]:/) || credentialsJson.startsWith("/"))
        ? credentialsJson.trim()
        : resolve(process.cwd(), credentialsJson.trim().startsWith("./") ? credentialsJson.trim().substring(2) : credentialsJson.trim());
    
    throw new Error(
      `Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: ${err.message}\n` +
      `Original env value: "${credentialsJson}"\n` +
      `Attempted path: ${attemptedPath}\n` +
      `Current working directory: ${process.cwd()}`
    );
  }

  // Use JWT authentication directly for service accounts
  // This ensures proper token generation with correct timestamps
  const authClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    projectId: credentials.project_id,
  });

  // Ensure we have a valid token
  await authClient.authorize();

  searchConsoleClient = google.searchconsole({
    version: "v1",
    auth: authClient,
  });

  return searchConsoleClient;
}

/**
 * Get search analytics data for a site
 * @param {string} siteUrl - The site URL (must be verified in Search Console)
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Search analytics data
 */
export async function getSearchAnalytics(siteUrl, startDate, endDate) {
  const client = await getSearchConsoleClient();

  try {
    const response = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["date", "query", "page"],
        rowLimit: 1000,
      },
    });

    const rows = response.data.rows || [];

    // Aggregate totals
    const totals = rows.reduce(
      (acc, row) => {
        acc.clicks += row.clicks || 0;
        acc.impressions += row.impressions || 0;
        acc.ctr += row.ctr || 0;
        acc.position += row.position || 0;
        return acc;
      },
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );

    const avgCtr = rows.length > 0 ? totals.ctr / rows.length : 0;
    const avgPosition = rows.length > 0 ? totals.position / rows.length : 0;

    return {
      totalClicks: totals.clicks,
      totalImpressions: totals.impressions,
      averageCtr: avgCtr,
      averagePosition: avgPosition,
      rows: rows.slice(0, 100), // Limit to top 100 rows for display
      dateRange: { startDate, endDate },
    };
  } catch (err) {
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Unknown Search Console API error";
    throw new Error(`Search Console API error: ${message}`);
  }
}

/**
 * Get sitemap information
 * @param {string} siteUrl - The site URL
 * @returns {Promise<Object>} Sitemap data
 */
export async function getSitemaps(siteUrl) {
  const client = await getSearchConsoleClient();

  try {
    const response = await client.sitemaps.list({ siteUrl });
    const sitemaps = response.data.sitemap || [];

    return {
      sitemaps: sitemaps.map((sitemap) => ({
        path: sitemap.path,
        lastSubmitted: sitemap.lastSubmitted,
        contentsCount: sitemap.contentsCount || 0,
        isPending: sitemap.isPending || false,
        isSitemapsIndex: sitemap.isSitemapsIndex || false,
      })),
    };
  } catch (err) {
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Unknown Search Console API error";
    throw new Error(`Search Console API error: ${message}`);
  }
}

/**
 * Get URL inspection data (indexing status)
 * @param {string} siteUrl - The site URL
 * @param {string} inspectionUrl - The URL to inspect
 * @returns {Promise<Object>} Inspection data
 */
export async function inspectUrl(siteUrl, inspectionUrl) {
  const client = await getSearchConsoleClient();

  try {
    const response = await client.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl,
        siteUrl,
      },
    });

    const inspectionResult = response.data.inspectionResult || {};

    return {
      indexStatusResult: {
        verdict: inspectionResult.indexStatusResult?.verdict || "UNKNOWN",
        coverageState: inspectionResult.indexStatusResult?.coverageState || "UNKNOWN",
        lastCrawlTime: inspectionResult.indexStatusResult?.lastCrawlTime || null,
        indexingState: inspectionResult.indexStatusResult?.indexingState || "UNKNOWN",
      },
      url: inspectionUrl,
    };
  } catch (err) {
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Unknown Search Console API error";
    throw new Error(`Search Console API error: ${message}`);
  }
}

/**
 * Get site verification status and basic info
 * @param {string} siteUrl - The site URL
 * @returns {Promise<Object>} Site information
 */
export async function getSiteInfo(siteUrl) {
  try {
    // Try to get sitemaps as a way to verify access
    const sitemaps = await getSitemaps(siteUrl);
    
    return {
      siteUrl,
      verified: true,
      sitemapsCount: sitemaps.sitemaps.length,
    };
  } catch (err) {
    return {
      siteUrl,
      verified: false,
      error: err.message,
    };
  }
}

/**
 * Get comprehensive Search Console report
 * @param {string} siteUrl - The site URL
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Object>} Complete Search Console data
 */
export async function getSearchConsoleReport(siteUrl, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);

  try {
    const [searchAnalytics, sitemaps, siteInfo] = await Promise.all([
      getSearchAnalytics(siteUrl, startDateStr, endDateStr).catch((err) => ({
        error: err.message,
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
        averagePosition: 0,
        rows: [],
      })),
      getSitemaps(siteUrl).catch((err) => ({
        error: err.message,
        sitemaps: [],
      })),
      getSiteInfo(siteUrl).catch((err) => ({
        error: err.message,
        verified: false,
      })),
    ]);

    return {
      siteUrl,
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
        days,
      },
      searchAnalytics,
      sitemaps,
      siteInfo,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    throw new Error(`Failed to fetch Search Console data: ${err.message}`);
  }
}

