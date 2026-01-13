"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FiBarChart2,
  FiTrendingUp,
  FiEye,
  FiMousePointer,
  FiRefreshCw,
  FiAlertCircle,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertTriangle,
  FiHelpCircle,
} from "react-icons/fi";
import { getConnectionStatus } from "../../lib/errorHandling";

const TIME_RANGES = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "28d", label: "Last 28 days" },
  { value: "3m", label: "Last 3 months" },
];

export default function PerformanceReportSection() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const userSiteLink = session?.user?.siteLink;

  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null); // { errorType, userMessage, actionRequired, technicalDetails }
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState("28d");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState(null);

  useEffect(() => {
    if (!isSuperAdmin && !userSiteLink) {
      setErrorInfo({
        errorType: "NO_SITE_LINKED",
        userMessage: "No website URL linked to your account.",
        actionRequired: "Please contact an administrator to link a website URL to your account.",
      });
      setLoading(false);
      return;
    }
    fetchPerformanceData();
  }, [timeRange, currentPage, session, isSuperAdmin, userSiteLink]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setErrorInfo(null);

      const siteUrl = isSuperAdmin ? (userSiteLink || "") : userSiteLink;
      
      if (!siteUrl) {
        setErrorInfo({
          errorType: "NO_SITE_LINKED",
          userMessage: "No website URL available.",
          actionRequired: "Please contact an administrator.",
        });
        setLoading(false);
        return;
      }

      const url = `/api/searchconsole/performance?range=${timeRange}&page=${currentPage}&pageSize=10${isSuperAdmin ? `&url=${encodeURIComponent(siteUrl)}` : ""}`;

      const res = await fetch(url);
      const responseData = await res.json();

      if (!res.ok) {
        // Error response with classified error information
        setErrorInfo({
          errorType: responseData.errorType || "UNKNOWN_ERROR",
          userMessage: responseData.userMessage || responseData.error || "Failed to fetch Search Console performance data.",
          actionRequired: responseData.actionRequired || "Please try again later.",
          technicalDetails: responseData.technicalDetails,
          originalError: responseData.originalError,
        });
        setLoading(false);
        return;
      }

      // Success - clear errors and update data
      setErrorInfo(null);
      setData(responseData);
      setLastSuccessfulSync(new Date().toISOString());
    } catch (err) {
      setErrorInfo({
        errorType: "UNKNOWN_ERROR",
        userMessage: "An unexpected error occurred while fetching performance data.",
        actionRequired: "Please try again later. If the issue persists, contact support.",
        technicalDetails: err.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPerformanceData();
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatPercentage = (num) => {
    if (num === null || num === undefined) return "0.00%";
    return `${(num * 100).toFixed(2)}%`;
  };

  const formatPosition = (num) => {
    if (num === null || num === undefined) return "N/A";
    return num.toFixed(1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}.${Math.floor((diffMinutes / 60) * 10)} hours ago`;
    }
    return `${diffMinutes} minutes ago`;
  };

  // Get connection status
  const connectionStatus = getConnectionStatus(errorInfo?.errorType);
  
  // Prepare chart data
  const chartData = data?.timeSeries?.map((item) => ({
    date: formatDate(item.date),
    fullDate: item.date,
    clicks: item.clicks,
    impressions: item.impressions,
  })) || [];

  // Determine if we should show fallback UI (error but keep layout)
  const showFallbackUI = errorInfo && !loading;
  const hasData = data && !errorInfo;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-black tracking-tight">
              Performance
            </h2>
            <p className="text-gray-600 dark:text-gray-700 mt-2 text-sm lg:text-base">
              Search Console performance metrics and analytics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                setCurrentPage(1);
              }}
              disabled={loading || showFallbackUI}
              className="px-4 py-2 border border-gray-200 dark:border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0EFF2A] focus:border-transparent bg-white dark:bg-gray-50 text-gray-900 dark:text-black text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {TIME_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-50 border border-gray-200 dark:border-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-100 text-gray-700 dark:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="text-sm font-semibold">Refresh</span>
            </button>
          </div>
        </div>

        {/* System Status Panel */}
        <div className="mb-4 bg-white dark:bg-gray-50 rounded-xl border border-gray-200 dark:border-gray-300 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${
                connectionStatus.color === "green" ? "bg-green-50 dark:bg-green-100" :
                connectionStatus.color === "orange" ? "bg-orange-50 dark:bg-orange-100" :
                connectionStatus.color === "yellow" ? "bg-yellow-50 dark:bg-yellow-100" :
                "bg-red-50 dark:bg-red-100"
              }`}>
                {connectionStatus.icon === "check" && (
                  <FiCheckCircle className={`w-4 h-4 ${
                    connectionStatus.color === "green" ? "text-green-600" : ""
                  }`} />
                )}
                {connectionStatus.icon === "x" && (
                  <FiXCircle className="w-4 h-4 text-red-600" />
                )}
                {connectionStatus.icon === "alert" && (
                  <FiAlertTriangle className="w-4 h-4 text-orange-600" />
                )}
                {connectionStatus.icon === "clock" && (
                  <FiClock className="w-4 h-4 text-yellow-600" />
                )}
                <span className={`text-sm font-semibold ${
                  connectionStatus.color === "green" ? "text-green-700" :
                  connectionStatus.color === "orange" ? "text-orange-700" :
                  connectionStatus.color === "yellow" ? "text-yellow-700" :
                  "text-red-700"
                }`}>
                  {connectionStatus.label}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-700">
                <span className="font-medium">Last sync:</span>{" "}
                {lastSuccessfulSync ? getTimeAgo(lastSuccessfulSync) : "Never"}
              </div>
            </div>
            {errorInfo?.actionRequired && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-700">
                <FiHelpCircle className="w-4 h-4" />
                <span className="font-medium">Action required</span>
              </div>
            )}
          </div>
        </div>

        {/* Last Updated - only show when data is available */}
        {hasData && data?.lastUpdated && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-700">
            <FiInfo className="w-4 h-4" />
            <span>Last update: {getTimeAgo(data.lastUpdated)}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorInfo && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 shadow-sm" role="alert">
          <div className="flex items-start space-x-2.5">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <FiAlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                {errorInfo.userMessage}
              </p>
              <p className="text-sm text-red-700 dark:text-red-400">
                {errorInfo.actionRequired}
              </p>
              {isSuperAdmin && errorInfo.technicalDetails && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-auto">
                    {errorInfo.technicalDetails}
                    {errorInfo.originalError && `\n\nOriginal Error: ${errorInfo.originalError}`}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State - only show on initial load */}
      {loading && !data && !showFallbackUI && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-600">Loading performance data...</p>
          </div>
        </div>
      )}

      {/* Summary Cards - Always visible, but disabled when error */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className={`bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden ${
          showFallbackUI ? "opacity-50" : ""
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#0EFF2A]/5 rounded-full blur-2xl -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#0EFF2A] to-[#0BCC22] rounded-xl flex items-center justify-center shadow-md">
                <FiMousePointer className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Total Clicks</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-black">
              {hasData ? formatNumber(data.totals?.clicks) : showFallbackUI ? "N/A" : "—"}
            </p>
            {showFallbackUI && (
              <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">Data unavailable</p>
            )}
          </div>
        </div>

        <div className={`bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden ${
          showFallbackUI ? "opacity-50" : ""
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <FiEye className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Total Impressions</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-black">
              {hasData ? formatNumber(data.totals?.impressions) : showFallbackUI ? "N/A" : "—"}
            </p>
            {showFallbackUI && (
              <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">Data unavailable</p>
            )}
          </div>
        </div>

        <div className={`bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden ${
          showFallbackUI ? "opacity-50" : ""
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-md">
                <FiTrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Average CTR</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-black">
              {hasData ? formatPercentage(data.totals?.averageCtr) : showFallbackUI ? "N/A" : "—"}
            </p>
            {showFallbackUI && (
              <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">Data unavailable</p>
            )}
          </div>
        </div>

        <div className={`bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 relative overflow-hidden ${
          showFallbackUI ? "opacity-50" : ""
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <FiBarChart2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-700 mb-1">Average Position</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-black">
              {hasData ? formatPosition(data.totals?.averagePosition) : showFallbackUI ? "N/A" : "—"}
            </p>
            {showFallbackUI && (
              <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">Data unavailable</p>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Chart - Show placeholder when error */}
      <div className={`bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 px-6 py-6 mb-6 ${
        showFallbackUI ? "opacity-50" : ""
      }`}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-black mb-4">
          Clicks and Impressions Over Time
        </h3>
        {hasData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                yAxisId="left"
                stroke="#0EFF2A"
                style={{ fontSize: "12px" }}
                label={{ value: "Clicks", angle: -90, position: "insideLeft", style: { fill: "#0EFF2A" } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3b82f6"
                style={{ fontSize: "12px" }}
                label={{ value: "Impressions", angle: 90, position: "insideRight", style: { fill: "#3b82f6" } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                stroke="#0EFF2A"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Clicks"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="impressions"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Impressions"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : showFallbackUI ? (
          <div className="flex items-center justify-center h-[400px] bg-gray-50 dark:bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-400">
            <div className="text-center">
              <FiBarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-600">Chart data unavailable</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {errorInfo?.actionRequired || "Please check the error message above"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <div className="inline-block h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-sm text-gray-600">Loading chart data...</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Queries Table - Show placeholder when error */}
      <div className={`bg-white dark:bg-gray-50 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-300/60 overflow-hidden ${
        showFallbackUI ? "opacity-50" : ""
      }`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-300">
          <h3 className="text-lg font-bold text-gray-900 dark:text-black">
            Top Queries
          </h3>
          {hasData && data.topQueries ? (
            <p className="text-sm text-gray-600 dark:text-gray-700 mt-1">
              Showing {((currentPage - 1) * 10) + 1}–{Math.min(currentPage * 10, data.topQueries.total)} of {formatNumber(data.topQueries.total)} rows
            </p>
          ) : showFallbackUI ? (
            <p className="text-sm text-gray-500 dark:text-gray-600 mt-1">
              Table data unavailable
            </p>
          ) : null}
        </div>
        {hasData && data.topQueries && data.topQueries.queries.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-300 bg-gray-50 dark:bg-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                      Query
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
                  {data.topQueries.queries.map((query, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-100/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-black font-medium">
                          {query.query}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-black font-medium">
                        {formatNumber(query.clicks)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-black font-medium">
                        {formatNumber(query.impressions)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-black font-medium">
                        {formatPercentage(query.ctr)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-black font-medium">
                        {formatPosition(query.position)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {data.topQueries.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-300 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-700">
                  Page {currentPage} of {data.topQueries.totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(data.topQueries.totalPages, p + 1))}
                    disabled={currentPage === data.topQueries.totalPages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FiChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : showFallbackUI ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FiBarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-600">No query data available</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {errorInfo?.actionRequired || "Please check the error message above"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-sm text-gray-600">Loading query data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
