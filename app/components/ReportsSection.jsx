"use client";

import { useState, useEffect } from "react";
import { FiFileText, FiDownload, FiRefreshCw, FiAlertCircle, FiExternalLink, FiTrash2 } from "react-icons/fi";

export default function ReportsSection() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err?.message || "An error occurred while fetching reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownload = async (reportId) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (!res.ok) {
        throw new Error("Failed to download report");
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `pagespeed-report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err?.message || "Failed to download report");
    }
  };

  const handleDelete = async (reportId) => {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return;
    }

    setDeletingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete report");
      }

      // Remove the report from the list
      setReports(reports.filter((report) => report.id !== reportId));
    } catch (err) {
      alert(err?.message || "Failed to delete report");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPerformanceSummary = (report) => {
    const scores = [];
    if (report.performanceScore !== null) {
      scores.push(`Performance: ${report.performanceScore}`);
    }
    if (report.seoScore !== null) {
      scores.push(`SEO: ${report.seoScore}`);
    }
    if (report.accessibilityScore !== null) {
      scores.push(`Accessibility: ${report.accessibilityScore}`);
    }
    return scores.length > 0 ? scores.join(" | ") : "No scores available";
  };

  const getScoreColor = (score) => {
    if (score === null) return "text-gray-500";
    if (score >= 90) return "text-[#0EFF2A]";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-gray-200/50 dark:ring-gray-300/50">
                <FiFileText className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-400 rounded-full border-2 border-white dark:border-gray-50"></div>
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-black tracking-tight">
                Reports
              </h2>
              <p className="text-gray-600 dark:text-gray-700 mt-2 text-sm lg:text-base">
                View and download your generated PageSpeed reports
              </p>
            </div>
          </div>
          <button
            onClick={fetchReports}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white dark:bg-gray-100 border-2 border-gray-200 dark:border-gray-300 text-gray-900 dark:text-black font-medium shadow-sm hover:shadow-md hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
            aria-label="Refresh reports"
          >
            <FiRefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-300/60 relative overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-gray-200/10 to-transparent rounded-full blur-3xl -z-0"></div>

        <div className="relative z-10">
          {loading ? (
            <div className="px-8 py-16 lg:px-12 lg:py-20 text-center">
              <div className="inline-block h-8 w-8 border-2 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 dark:text-gray-700">Loading reports...</p>
            </div>
          ) : error ? (
            <div className="px-8 py-8 lg:px-10 lg:py-10">
              <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 shadow-sm" role="alert">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shrink-0">
                    <FiAlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          ) : reports.length === 0 ? (
            <div className="px-8 py-16 lg:px-12 lg:py-20 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200/50 dark:from-gray-200 dark:to-gray-300/50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border-2 border-gray-200/60 dark:border-gray-300/60 ring-4 ring-gray-50 dark:ring-gray-100">
                <FiFileText className="w-12 h-12 text-gray-600 dark:text-gray-700" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-black mb-3">
                No Reports Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-700 text-base leading-relaxed mb-8">
                Generate your first PageSpeed report from the Page Speed section to see it here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-300">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                      Performance Summary
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-900 dark:text-black uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-300">
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-100/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-black font-medium">
                          {formatDate(report.generatedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <a
                            href={report.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-900 dark:text-black font-medium hover:text-[#0EFF2A] transition-colors max-w-md truncate"
                            title={report.url}
                          >
                            {report.url}
                          </a>
                          <FiExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 dark:text-gray-800">
                          {report.performanceScore !== null && (
                            <span className={`font-semibold ${getScoreColor(report.performanceScore)}`}>
                              {report.performanceScore}
                            </span>
                          )}
                          {report.seoScore !== null && (
                            <>
                              <span className="mx-2 text-gray-400">•</span>
                              <span className={`font-semibold ${getScoreColor(report.seoScore)}`}>
                                {report.seoScore}
                              </span>
                            </>
                          )}
                          {report.accessibilityScore !== null && (
                            <>
                              <span className="mx-2 text-gray-400">•</span>
                              <span className={`font-semibold ${getScoreColor(report.accessibilityScore)}`}>
                                {report.accessibilityScore}
                              </span>
                            </>
                          )}
                          {report.performanceScore === null && report.seoScore === null && report.accessibilityScore === null && (
                            <span className="text-gray-500">No scores available</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleDownload(report.id)}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#0EFF2A] to-[#0BCC22] text-black font-bold shadow-md shadow-[#0EFF2A]/20 hover:shadow-lg hover:shadow-[#0EFF2A]/30 hover:scale-105 transition-all duration-200"
                            aria-label={`Download report for ${report.url}`}
                          >
                            <FiDownload className="w-4 h-4 mr-2" />
                            Download
                          </button>
                          <button
                            onClick={() => handleDelete(report.id)}
                            disabled={deletingId === report.id}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 text-white font-bold shadow-md shadow-red-600/20 hover:shadow-lg hover:shadow-red-600/30 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
                            aria-label={`Delete report for ${report.url}`}
                          >
                            {deletingId === report.id ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Deleting...</span>
                              </>
                            ) : (
                              <>
                                <FiTrash2 className="w-4 h-4 mr-2" />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

