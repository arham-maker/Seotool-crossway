import axios from "axios";

/**
 * Calls Google PageSpeed Insights API and extracts key metrics.
 *
 * Required ENV:
 *   - PAGESPEED_API_KEY: Google API key with PageSpeed Insights enabled
 */

const PAGESPEED_API_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function getPageSpeedReport(url) {
  const apiKey = process.env.PAGESPEED_API_KEY;

  if (!apiKey) {
    throw new Error(
      "PAGESPEED_API_KEY is not set. Please configure it in your environment."
    );
  }

  // Build query string manually to ensure proper encoding of repeated category params
  // Google PageSpeed API expects: category=performance&category=seo&category=accessibility&category=best-practices
  const categoryList = ["performance", "seo", "accessibility", "best-practices"];
  const categoryParams = categoryList.map(cat => `category=${encodeURIComponent(cat)}`).join("&");
  const queryString = `url=${encodeURIComponent(url)}&key=${encodeURIComponent(apiKey)}&strategy=mobile&${categoryParams}`;
  const fullUrl = `${PAGESPEED_API_ENDPOINT}?${queryString}`;

  let data;
  try {
    const response = await axios.get(fullUrl);
    data = response.data;
    
    // Debug logging in development
    if (process.env.NODE_ENV === "development") {
      const categoriesData = data?.lighthouseResult?.categories;
      if (categoriesData) {
        console.log("PageSpeed API Categories received:", {
          performance: categoriesData.performance?.score,
          seo: categoriesData.seo?.score,
          accessibility: categoriesData.accessibility?.score,
          "best-practices": categoriesData["best-practices"]?.score,
        });
      } else {
        console.warn("PageSpeed API response missing categories:", {
          hasLighthouseResult: !!data?.lighthouseResult,
          lighthouseKeys: data?.lighthouseResult ? Object.keys(data.lighthouseResult) : [],
        });
      }
    }
  } catch (err) {
    // Bubble up clearer error details from the PageSpeed API if present
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      "Unknown PageSpeed API error";
    const status = err?.response?.status;
    throw new Error(
      status ? `PageSpeed API error ${status}: ${message}` : message
    );
  }

  const lighthouseResult = data.lighthouseResult ?? {};
  const categories = lighthouseResult.categories ?? {};
  const audits = lighthouseResult.audits ?? {};

  // Extract scores - handle both number (0-1) and already converted (0-100) scores
  const getScore = (category) => {
    const score = category?.score;
    if (typeof score === "number") {
      // If score is between 0 and 1, convert to 0-100 scale
      if (score <= 1) {
        return Math.round(score * 100);
      }
      // If already 0-100, return as is
      return Math.round(score);
    }
    return null;
  };

  const performanceScore = getScore(categories.performance);
  const seoScore = getScore(categories.seo);
  const accessibilityScore = getScore(categories.accessibility);
  const bestPracticesScore = getScore(categories["best-practices"]);

  // Log warning if any scores are missing
  if (process.env.NODE_ENV === "development") {
    const missingScores = [];
    if (performanceScore === null) missingScores.push("Performance");
    if (seoScore === null) missingScores.push("SEO");
    if (accessibilityScore === null) missingScores.push("Accessibility");
    if (bestPracticesScore === null) missingScores.push("Best Practices");
    
    if (missingScores.length > 0) {
      console.warn(`PageSpeed API: Missing scores for: ${missingScores.join(", ")}`);
      console.warn("Available categories:", Object.keys(categories));
    }
  }

  const fcp = audits["first-contentful-paint"];
  const lcp = audits["largest-contentful-paint"];
  const cls = audits["cumulative-layout-shift"];
  const tbt = audits["total-blocking-time"];

  const metric = (audit) =>
    audit
      ? {
          title: audit.title,
          displayValue: audit.displayValue ?? null,
          numericValue: audit.numericValue ?? null,
          score:
            typeof audit.score === "number"
              ? Math.round(audit.score * 100)
              : null,
        }
      : null;

  return {
    lighthouseVersion: lighthouseResult.lighthouseVersion ?? null,
    fetchTime: lighthouseResult.fetchTime ?? null,
    performanceScore,
    seoScore,
    accessibilityScore,
    bestPracticesScore,
    metrics: {
      FCP: metric(fcp),
      LCP: metric(lcp),
      CLS: metric(cls),
      TBT: metric(tbt),
    },
  };
}

