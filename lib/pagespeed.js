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

  // Provide categories as an array so Axios encodes them as repeated params:
  // &category=performance&category=seo&category=accessibility
  const params = {
    url,
    key: apiKey,
    strategy: "mobile",
    category: ["performance", "seo", "accessibility"],
  };

  let data;
  try {
    const response = await axios.get(PAGESPEED_API_ENDPOINT, { params });
    data = response.data;
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

  const performanceScore =
    typeof categories.performance?.score === "number"
      ? Math.round(categories.performance.score * 100)
      : null;

  const seoScore =
    typeof categories.seo?.score === "number"
      ? Math.round(categories.seo.score * 100)
      : null;

  const accessibilityScore =
    typeof categories.accessibility?.score === "number"
      ? Math.round(categories.accessibility.score * 100)
      : null;

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
    metrics: {
      FCP: metric(fcp),
      LCP: metric(lcp),
      CLS: metric(cls),
      TBT: metric(tbt),
    },
  };
}

