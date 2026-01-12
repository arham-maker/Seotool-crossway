"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FiBarChart2,
  FiTrendingUp,
  FiEye,
  FiMousePointer,
  FiGlobe,
  FiUsers,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiExternalLink,
  FiShield,
  FiZap,
  FiAward,
} from "react-icons/fi";

export default function DashboardSection() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [pagespeedData, setPagespeedData] = useState(null);
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const isSuperAdmin = session?.user?.role === "super_admin";

  useEffect(() => {
    fetchDashboardData();
    fetchPageSpeedData();
  }, [days, session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const res = await fetch(`/api/dashboard?days=${days}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch dashboard data");
      }

      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPageSpeedData = async () => {
    try {
      const res = await fetch(`/api/pagespeed`);
      
      if (!res.ok) {
        // Don't show error for PageSpeed if it fails, just log it
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch PageSpeed data");
        }
        return;
      }

      const data = await res.json();
      setPagespeedData(data);
    } catch (err) {
      // Silently fail for PageSpeed data
      if (process.env.NODE_ENV === "development") {
        console.error("PageSpeed fetch error:", err);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    fetchPageSpeedData();
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

  const formatScore = (score) => {
    if (score === null || score === undefined) return "N/A";
    return `${score}`;
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return "text-gray-500";
    if (score >= 90) return "text-[#0EFF2A]";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0EFF2A] to-[#0BCC22] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0EFF2A]/20 ring-2 ring-[#0EFF2A]/10">
                <FiBarChart2 className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0EFF2A] rounded-full border-2 border-white dark:border-gray-50 animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-black tracking-tight">
                {isSuperAdmin ? "Super Admin Dashboard" : "My Dashboard"}
              </h2>
              <p className="text-gray-600 dark:text-gray-700 mt-2 text-sm lg:text-base">
                {isSuperAdmin
                  ? "View status and statistics of all users' websites"
                  : "View statistics and status of your website"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-200 dark:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EFF2A] focus:border-transparent bg-white dark:bg-gray-50 text-gray-900 dark:text-black text-sm font-semibold"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-50 border border-gray-200 dark:border-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-100 text-gray-700 dark:text-gray-800 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="text-sm font-semibold">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 shadow-sm" role="alert">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
              <FiAlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Super Admin View: All Users' Websites */}
      {isSuperAdmin && dashboardData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0EFF2A]/5 rounded-full blur-2xl -z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                    <FiUsers className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Total Users</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-black">
                  {formatNumber(dashboardData.totalUsers)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                    <FiGlobe className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Total Websites</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-black">
                  {formatNumber(dashboardData.totalWebsites)}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0EFF2A]/5 rounded-full blur-2xl -z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0EFF2A] to-[#0BCC22] rounded-xl flex items-center justify-center shadow-md">
                    <FiShield className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Role</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-black">Super Admin</p>
              </div>
            </div>
          </div>

          {/* Websites List */}
          {dashboardData.websites && dashboardData.websites.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {dashboardData.websites.map((website, index) => (
                <div
                  key={website.userId || index}
                  className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 p-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#0EFF2A]/5 rounded-full blur-2xl -z-0"></div>
                  
                  <div className="relative z-10">
                    {/* User Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-black mb-1">
                          {website.userName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-700">{website.userEmail}</p>
                      </div>
                      {website.statistics?.verified ? (
                        <FiCheckCircle className="w-5 h-5 text-[#0EFF2A]" />
                      ) : (
                        <FiAlertCircle className="w-5 h-5 text-yellow-600" />
                      )}
                    </div>

                    {/* Website URL */}
                    <div className="mb-4 flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-800">
                      <FiGlobe className="w-4 h-4" />
                      <a
                        href={website.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#0EFF2A] transition-colors flex items-center space-x-1"
                      >
                        <span className="truncate">{website.siteUrl}</span>
                        <FiExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Search Console Statistics */}
                    {website.statistics ? (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-800 mb-3">Search Console</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Total Clicks</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-black">
                              {formatNumber(website.statistics.totalClicks)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Total Impressions</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-black">
                              {formatNumber(website.statistics.totalImpressions)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Average CTR</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-black">
                              {formatPercentage(website.statistics.averageCtr)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Avg Position</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-black">
                              {formatPosition(website.statistics.averagePosition)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 rounded-lg border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          {website.error || "Unable to fetch Search Console statistics"}
                        </p>
                      </div>
                    )}

                    {/* PageSpeed Insights */}
                    {pagespeedData?.websites && (() => {
                      const sitePagespeed = pagespeedData.websites.find(w => w.userId === website.userId);
                      return sitePagespeed?.pagespeed ? (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-800 mb-3 flex items-center space-x-2">
                            <FiZap className="w-4 h-4" />
                            <span>PageSpeed Insights</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Performance</p>
                              <p className={`text-xl font-bold ${getScoreColor(sitePagespeed.pagespeed.performanceScore)}`}>
                                {formatScore(sitePagespeed.pagespeed.performanceScore)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">SEO</p>
                              <p className={`text-xl font-bold ${getScoreColor(sitePagespeed.pagespeed.seoScore)}`}>
                                {formatScore(sitePagespeed.pagespeed.seoScore)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Accessibility</p>
                              <p className={`text-xl font-bold ${getScoreColor(sitePagespeed.pagespeed.accessibilityScore)}`}>
                                {formatScore(sitePagespeed.pagespeed.accessibilityScore)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Best Practices</p>
                              <p className={`text-xl font-bold ${getScoreColor(sitePagespeed.pagespeed.bestPracticesScore)}`}>
                                {formatScore(sitePagespeed.pagespeed.bestPracticesScore)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 p-12 text-center">
              <FiGlobe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-700">No websites found</p>
            </div>
          )}
        </div>
      )}

      {/* Regular User View: Own Website */}
      {!isSuperAdmin && dashboardData && (
        <div className="space-y-6">
          {dashboardData.siteUrl ? (
            <>
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
                      {dashboardData.statistics ? formatNumber(dashboardData.statistics.totalClicks) : "N/A"}
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
                      {dashboardData.statistics ? formatNumber(dashboardData.statistics.totalImpressions) : "N/A"}
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
                      {dashboardData.statistics ? formatPercentage(dashboardData.statistics.averageCtr) : "N/A"}
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
                      {dashboardData.statistics ? formatPosition(dashboardData.statistics.averagePosition) : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* PageSpeed Insights Section */}
              {pagespeedData?.pagespeed && (
                <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <FiZap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-black">PageSpeed Insights</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-700">Performance metrics</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Performance</p>
                      <p className={`text-2xl font-bold ${getScoreColor(pagespeedData.pagespeed.performanceScore)}`}>
                        {formatScore(pagespeedData.pagespeed.performanceScore)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">SEO</p>
                      <p className={`text-2xl font-bold ${getScoreColor(pagespeedData.pagespeed.seoScore)}`}>
                        {formatScore(pagespeedData.pagespeed.seoScore)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Accessibility</p>
                      <p className={`text-2xl font-bold ${getScoreColor(pagespeedData.pagespeed.accessibilityScore)}`}>
                        {formatScore(pagespeedData.pagespeed.accessibilityScore)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-700 mb-1">Best Practices</p>
                      <p className={`text-2xl font-bold ${getScoreColor(pagespeedData.pagespeed.bestPracticesScore)}`}>
                        {formatScore(pagespeedData.pagespeed.bestPracticesScore)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Website Info Card */}
              <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center">
                    <FiGlobe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-black">Website Information</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-700">{dashboardData.siteUrl}</p>
                  </div>
                </div>
                {dashboardData.statistics ? (
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        {dashboardData.statistics.verified ? (
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
                              Site verification status unknown
                            </span>
                          </>
                        )}
                      </div>
                      {!dashboardData.statistics.verified && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-300">
                          <p className="text-xs text-gray-600 dark:text-gray-700">
                            Verify your site in <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-[#0EFF2A] hover:underline">Google Search Console</a> and grant the service account access.
                          </p>
                        </div>
                      )}
                    </div>
                    {dashboardData.statistics.sitemapsCount > 0 && (
                      <div className="text-sm text-gray-600 dark:text-gray-700">
                        <strong>{dashboardData.statistics.sitemapsCount}</strong> sitemap(s) found
                      </div>
                    )}
                    {dashboardData.dateRange && (
                      <div className="text-xs text-gray-500 dark:text-gray-600 pt-2 border-t border-gray-200 dark:border-gray-300">
                        Data from {dashboardData.dateRange.startDate} to {dashboardData.dateRange.endDate}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      {dashboardData.error || "Unable to fetch statistics"}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 p-12 text-center">
              <FiAlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-black mb-2">No Website Linked</h3>
              <p className="text-gray-600 dark:text-gray-700 mb-4">
                {dashboardData.message || "No website URL is linked to your account."}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-600">
                Please contact an administrator to link a website to your account.
              </p>
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
              About Dashboard
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-800 leading-relaxed">
              {isSuperAdmin
                ? "This dashboard displays statistics for all users' websites. Data is fetched from Google Search Console and updated when you refresh."
                : "This dashboard displays statistics for your linked website. Data is fetched from Google Search Console and updated when you refresh."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
