"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FiZap, FiGlobe, FiDownload, FiAlertCircle, FiCheckCircle, FiInfo } from "react-icons/fi";

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function PageSpeedSection() {
  const { data: session } = useSession();
  const isViewer = session?.user?.role === "viewer";
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reportId, setReportId] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setReportId(null);
    setPdfBlob(null);

    if (!url || !isValidUrl(url)) {
      setError("Please enter a valid website URL (including http:// or https://).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to generate report.");
      }

      const blob = await res.blob();
      const savedReportId = res.headers.get("X-Report-Id");
      
      setPdfBlob(blob);
      if (savedReportId) {
        setReportId(savedReportId);
      }
      setSuccessMessage("PDF report generated successfully. Click the download button below to download it.");
    } catch (err) {
      // Log error for debugging but show user-friendly message
      if (process.env.NODE_ENV === "development") {
        console.error("Report generation error:", err);
      }
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-[#0EFF2A] to-[#0BCC22] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0EFF2A]/20 ring-2 ring-[#0EFF2A]/10">
              <FiZap className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0EFF2A] rounded-full border-2 border-white dark:border-gray-50 animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-black tracking-tight">
              Page Speed Report
            </h2>
            <p className="text-gray-600 dark:text-gray-700 mt-2 text-sm lg:text-base">
              Generate comprehensive performance reports with Google PageSpeed Insights data
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-50 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-300/60 px-8 py-8 lg:px-10 lg:py-10 relative overflow-hidden">
        {/* Decorative gradient background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#0EFF2A]/5 to-transparent rounded-full blur-3xl -z-0"></div>

        <form onSubmit={handleSubmit} className="space-y-7 relative z-10">
          <div className="relative">
            <label
              htmlFor="url"
              className="flex items-center space-x-2 text-sm font-bold text-gray-900 dark:text-black mb-3"
            >
              <span>Website URL</span>
              <span className="text-red-500 text-xs" aria-label="required">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiGlobe className="w-5 h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-[#0EFF2A] transition-colors" aria-hidden="true" />
              </div>
              <input
                id="url"
                type="url"
                required
                disabled={isViewer}
                placeholder="https://example.com"
                className="w-full rounded-xl border-2 border-gray-200 dark:border-gray-300 bg-white dark:bg-gray-100 pl-12 pr-4 py-3.5 text-black dark:text-black placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0EFF2A]/20 focus:border-[#0EFF2A] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-describedby="url-help"
              />
            </div>
            <p id="url-help" className="mt-2.5 text-xs text-gray-600 dark:text-gray-700 flex items-center space-x-2">
              <FiInfo className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" />
              <span>Must be a full URL including protocol (e.g. https://example.com)</span>
            </p>
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

          {successMessage && (
            <div className="rounded-lg border px-4 py-3 shadow-sm" style={{ borderColor: 'oklch(37.3% 0.034 259.733 / 0.3)', backgroundColor: 'oklch(37.3% 0.034 259.733 / 0.1)' }} role="alert">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'oklch(37.3% 0.034 259.733 / 0.2)' }}>
                  <FiCheckCircle className="w-4 h-4" style={{ color: 'oklch(37.3% 0.034 259.733)' }} aria-hidden="true" />
                </div>
                <p className="text-sm font-medium" style={{ color: 'oklch(37.3% 0.034 259.733)' }}>{successMessage}</p>
              </div>
            </div>
          )}

          {pdfBlob && (
            <div className="rounded-lg border-2 border-[#0EFF2A]/30 bg-[#0EFF2A]/5 px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#0EFF2A]/20 rounded-lg flex items-center justify-center">
                    <FiDownload className="w-5 h-5" style={{ color: 'oklch(37.3% 0.034 259.733)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-black">Report Ready</p>
                    <p className="text-xs text-gray-600 dark:text-gray-700">Your PDF report is ready to download</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const downloadUrl = window.URL.createObjectURL(pdfBlob);
                    const link = document.createElement("a");
                    link.href = downloadUrl;
                    link.download = `pagespeed-report-${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(downloadUrl);
                  }}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0EFF2A] to-[#0BCC22] text-black font-bold shadow-lg shadow-[#0EFF2A]/30 hover:shadow-xl hover:shadow-[#0EFF2A]/40 hover:scale-[1.02] transition-all duration-300"
                >
                  <FiDownload className="w-4 h-4 mr-2" />
                  Download Report
                </button>
              </div>
            </div>
          )}

          {isViewer && (
            <div className="rounded-lg border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 shadow-sm" role="alert">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center shrink-0">
                  <FiInfo className="w-4 h-4 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Viewers have read-only access and cannot generate reports.
                </p>
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || isViewer}
            className="w-full lg:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#0EFF2A] to-[#0BCC22] text-black font-bold shadow-lg shadow-[#0EFF2A]/30 hover:shadow-xl hover:shadow-[#0EFF2A]/40 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 group"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <FiDownload className="w-5 h-5 mr-2 group-hover:translate-y-0.5 transition-transform" />
                <span>Generate PDF Report</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Info Card */}
      <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-100 dark:to-gray-200/50 border border-gray-200/60 dark:border-gray-300/60 rounded-2xl px-6 py-5 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0EFF2A]/5 rounded-full blur-2xl -z-0"></div>
        <div className="flex items-start space-x-4 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-700 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center shadow-lg shrink-0 ring-2 ring-white dark:ring-gray-50">
            <FiInfo className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-black mb-2">
              About Page Speed Reports
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-800 leading-relaxed">
              PageSpeed metrics are powered by Google PageSpeed Insights API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
