"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FiSearch,
  FiGlobe,
  FiTrendingUp,
  FiEye,
  FiMousePointer,
  FiBarChart2,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiRefreshCw,
  FiExternalLink,
} from "react-icons/fi";

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function SearchConsoleSection() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const userSiteLink = session?.user?.siteLink;
  
  const [url, setUrl] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  // Auto-load user's siteLink for regular users
  useEffect(() => {
    if (!isSuperAdmin && userSiteLink && !url) {
      setUrl(userSiteLink);
    }
  }, [userSiteLink, isSuperAdmin, url]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setData(null);

    if (!url || !isValidUrl(url)) {
      setError("Please enter a valid website URL (including http:// or https://).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/searchconsole", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          days: parseInt(days),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.details || "Failed to fetch Search Console data.");
      }

      const reportData = await res.json();
      setData(reportData);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Search Console error:", err);
      }
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "N/A";
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatPercentage = (num) => {
    if (num === null || num === undefined) return "N/A";
    return `${(num * 100).toFixed(2)}%`;
  };

  const formatPosition = (num) => {
    if (num === null || num === undefined) return "N/A";
    return num.toFixed(1);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0EFF2A] to-[#0BCC22] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0EFF2A]/20 ring-2 ring-[#0EFF2A]/10">
              <FiSearch className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0EFF2A] rounded-full border-2 border-white dark:border-gray-50 animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-black tracking-tight">
              Search Console
            </h2>
            <p className="text-gray-600 dark:text-gray-700 mt-2 text-sm lg:text-base">
              View Google Search Console data including clicks, impressions, CTR, and position
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-300/60 px-8 py-8 lg:px-10 lg:py-10 relative overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#0EFF2A]/5 to-transparent rounded-full blur-3xl -z-0"></div>

        <form onSubmit={handleSubmit} className="space-y-7 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative">
              <label
                htmlFor="url"
                className="flex items-center space-x-2 text-sm font-bold text-gray-900 dark:text-black mb-3"
              >
                <span>Website URL</span>
                <span className="text-red-500 text-xs" aria-label="required">*</span>
                {!isSuperAdmin && userSiteLink && (
                  <span className="text-xs text-[#0EFF2A] font-normal">(Auto-loaded from your account)</span>
                )}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiGlobe className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[#0EFF2A] transition-colors" aria-hidden="true" />
                </div>
                <input
                  id="url"
                  type="url"
                  required
                  disabled={!isSuperAdmin && !!userSiteLink}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-300 bg-white dark:bg-gray-100 pl-12 pr-4 py-3.5 text-black dark:text-black placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0EFF2A]/20 focus:border-[#0EFF2A] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  aria-describedby="url-help"
                />
              </div>
              <p id="url-help" className="mt-2.5 text-xs text-gray-600 dark:text-gray-700 flex items-center space-x-2">
                <FiInfo className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" />
                <span>
                  {!isSuperAdmin && userSiteLink
                    ? "Your website URL is linked to your account. Super admins can enter any URL."
                    : "Must be verified in Google Search Console"}
                </span>
              </p>
            </div>

            <div className="relative">
              <label
                htmlFor="days"
                className="flex items-center space-x-2 text-sm font-bold text-gray-900 dark:text-black mb-3"
              >
                <span>Days to Fetch</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiBarChart2 className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[#0EFF2A] transition-colors" aria-hidden="true" />
                </div>
                <input
                  id="days"
                  type="number"
                  min="1"
                  max="90"
                  placeholder="30"
                  className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-300 bg-white dark:bg-gray-100 pl-12 pr-4 py-3.5 text-black dark:text-black placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0EFF2A]/20 focus:border-[#0EFF2A] transition-all duration-200 shadow-sm hover:shadow-md"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                />
              </div>
              <p className="mt-2.5 text-xs text-gray-600 dark:text-gray-700">
                Number of days to look back (1-90 days)
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 shadow-sm" role="alert">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                  <FiAlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full lg:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#0EFF2A] to-[#0BCC22] text-black font-bold shadow-lg shadow-[#0EFF2A]/30 hover:shadow-xl hover:shadow-[#0EFF2A]/40 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 group"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Fetching Data...</span>
              </>
            ) : (
              <>
                <FiRefreshCw className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                <span>Fetch Search Console Data</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Data Display */}
      {data && (
        <div className="mt-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0EFF2A]/5 rounded-full blur-2xl -z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0EFF2A] to-[#0BCC22] rounded-xl flex items-center justify-center shadow-md">
                    <FiMousePointer className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Total Clicks</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-black">
                  {formatNumber(data.searchAnalytics?.totalClicks)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                    <FiEye className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Total Impressions</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-black">
                  {formatNumber(data.searchAnalytics?.totalImpressions)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-md">
                    <FiTrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Average CTR</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-black">
                  {formatPercentage(data.searchAnalytics?.averageCtr)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                    <FiBarChart2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Average Position</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-black">
                  {formatPosition(data.searchAnalytics?.averagePosition)}
                </p>
              </div>
            </div>
          </div>

          {/* Site Info */}
          {data.siteInfo && (
            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center">
                  <FiGlobe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-black">Site Information</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-700">
                    {data.siteUrl}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {data.siteInfo.verified ? (
                  <>
                    <FiCheckCircle className="w-5 h-5 text-[#0EFF2A]" />
                    <span className="text-sm text-gray-700 dark:text-gray-800">
                      Site is verified in Search Console
                    </span>
                  </>
                ) : (
                  <>
                    <FiAlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-800">
                      {data.siteInfo.error || "Site verification status unknown"}
                    </span>
                  </>
                )}
              </div>
              {data.sitemaps?.sitemaps && data.sitemaps.sitemaps.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-300">
                  <p className="text-sm text-gray-600 dark:text-gray-700 mb-2">
                    <strong>{data.sitemaps.sitemaps.length}</strong> sitemap(s) found
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Top Queries/Pages Table */}
          {data.searchAnalytics?.rows && data.searchAnalytics.rows.length > 0 && (
            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 dark:text-black">
                  Top Performing Queries & Pages
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-700 mt-1">
                  Showing top {data.searchAnalytics.rows.length} results
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-300 bg-gray-50 dark:bg-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                        Query / Page
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                        Clicks
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                        Impressions
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                        CTR
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                        Position
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-300">
                    {data.searchAnalytics.rows.map((row, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 dark:hover:bg-gray-100/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-black font-medium">
                            {row.keys?.[1] || row.keys?.[0] || "N/A"}
                          </div>
                          {row.keys?.[2] && (
                            <div className="text-xs text-gray-500 dark:text-gray-600 mt-1 flex items-center space-x-1">
                              <FiExternalLink className="w-3 h-3" />
                              <span className="truncate max-w-md">{row.keys[2]}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-black font-medium">
                          {formatNumber(row.clicks)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-black font-medium">
                          {formatNumber(row.impressions)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-black font-medium">
                          {formatPercentage(row.ctr)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-black font-medium">
                          {formatPosition(row.position)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-100 dark:to-gray-200/50 border border-gray-200/60 dark:border-gray-300/60 rounded-2xl px-6 py-5 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0EFF2A]/5 rounded-full blur-2xl -z-0"></div>
        <div className="flex items-start space-x-4 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center shadow-lg shrink-0 ring-2 ring-white dark:ring-gray-50">
            <FiInfo className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-black mb-2">
              About Search Console Integration
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-800 leading-relaxed">
              This integration uses the Google Search Console API to fetch search performance data. The site must be verified in Google Search Console and the service account must have access to the property.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

