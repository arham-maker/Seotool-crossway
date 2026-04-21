"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  FiCheckSquare,
  FiSquare,
  FiRefreshCw,
  FiTrendingDown,
  FiTrendingUp,
  FiGlobe,
  FiSearch,
  FiChevronDown,
  FiArrowRight,
  FiInfo,
  FiClipboard,
} from "react-icons/fi";
import ApprovalsUserPanel from "./ApprovalsUserPanel";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const RANGE_OPTIONS = [
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "28d", label: "28 days" },
  { id: "3m", label: "3 months" },
];

const COUNTRY_NAMES = {
  us: "United States",
  pk: "Pakistan",
  ca: "Canada",
  cn: "China",
  de: "Germany",
  fr: "France",
  ie: "Ireland",
  gb: "United Kingdom",
  in: "India",
};

function formatNum(value) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value || 0)));
}

function formatCompact(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    Math.max(0, Math.round(value || 0))
  );
}

function formatPct(value) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}

function formatPos(value) {
  return (value || 0).toFixed(1);
}

function shortLabel(urlOrText) {
  if (!urlOrText) return "-";
  return urlOrText.length > 26 ? `${urlOrText.slice(0, 26)}...` : urlOrText;
}

function pctChangeFromCtr(ctr) {
  const pct = ((ctr || 0) * 100).toFixed(1);
  return `${pct}%`;
}

function getTimeAgo(value) {
  if (!value) return "-";
  const then = new Date(value).getTime();
  const now = Date.now();
  const diffHrs = Math.max(0, Math.floor((now - then) / (1000 * 60 * 60)));
  if (diffHrs < 1) return "less than 1 hour ago";
  if (diffHrs === 1) return "1 hour ago";
  return `${diffHrs} hours ago`;
}

export default function WebsiteStatisticsPanel({ selectedSite = "", title = "Website Statistics" }) {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const userSiteLink = session?.user?.siteLink || "";

  const [range, setRange] = useState("3m");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [activeDetailView, setActiveDetailView] = useState(null);
  const [activeMetrics, setActiveMetrics] = useState({
    clicks: true,
    impressions: true,
    ctr: false,
    position: false,
  });
  const [mainTab, setMainTab] = useState("overview");
  const [approvalOpenCount, setApprovalOpenCount] = useState(0);
  const [approvalCountNonce, setApprovalCountNonce] = useState(0);
  const showApprovalsTab = !isSuperAdmin;

  const effectiveSite = isSuperAdmin ? (selectedSite || userSiteLink) : userSiteLink;

  useEffect(() => {
    if (!showApprovalsTab) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/approvals");
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const list = data.approvals || [];
        const n = list.filter((a) => a.status === "pending" || a.status === "edited").length;
        setApprovalOpenCount(n);
      } catch {
        if (!cancelled) setApprovalOpenCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showApprovalsTab, mainTab, approvalCountNonce]);

  useEffect(() => {
    const bump = () => setApprovalCountNonce((n) => n + 1);
    if (typeof window === "undefined") return undefined;
    window.addEventListener("approvals:user-updated", bump);
    return () => window.removeEventListener("approvals:user-updated", bump);
  }, []);

  const fetchData = useCallback(async () => {
    if (!effectiveSite) {
      setPayload(null);
      setError("No website selected. Please choose a site.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const url = `/api/searchconsole/performance?range=${range}&page=1&pageSize=10${isSuperAdmin ? `&url=${encodeURIComponent(effectiveSite)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.userMessage || data.error || "Failed to fetch statistics");
      }
      setPayload(data);
    } catch (err) {
      setError(err.message || "Unable to load website statistics");
    } finally {
      setLoading(false);
    }
  }, [effectiveSite, isSuperAdmin, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = useMemo(() => {
    return (payload?.timeSeries || []).map((item) => ({
      date: item.date.slice(5),
      clicks: item.clicks || 0,
      impressions: item.impressions || 0,
      ctr: (item.ctr || 0) * 100,
      position: item.position || 0,
    }));
  }, [payload]);

  const maxCountryClicks = useMemo(() => {
    const values = (payload?.topCountries?.countries || []).map((c) => c.clicks || 0);
    return Math.max(1, ...values);
  }, [payload]);

  const toggleMetric = (key) => {
    setActiveMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const pagesData = payload?.topPages?.pages || [];
  const countriesData = payload?.topCountries?.countries || [];
  const keywordsData = payload?.topQueries?.queries || [];

  if (activeDetailView) {
    const detailTitle = activeDetailView === "pages"
      ? "Pages and Screens"
      : activeDetailView === "countries"
        ? "Countries"
        : "Keywords";

    return (
      <div className="rounded-xl border border-gray-200 bg-[#ffffff] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[26px] font-semibold text-gray-900">{detailTitle}</h2>
          <button
            type="button"
            onClick={() => setActiveDetailView(null)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        {activeDetailView === "pages" && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="grid grid-cols-[1fr_90px_110px_90px_90px] gap-2 bg-gray-50 px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase">
              <span>Page</span>
              <span className="text-right">Clicks</span>
              <span className="text-right">Impressions</span>
              <span className="text-right">CTR</span>
              <span className="text-right">Position</span>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {pagesData.map((row) => (
                <div key={row.page} className="grid grid-cols-[1fr_90px_110px_90px_90px] gap-2 px-4 py-2.5 text-sm border-t border-gray-100">
                  <span className="truncate text-gray-800">{row.page}</span>
                  <span className="text-right text-gray-800">{formatNum(row.clicks)}</span>
                  <span className="text-right text-gray-800">{formatNum(row.impressions)}</span>
                  <span className="text-right text-gray-800">{formatPct(row.ctr)}</span>
                  <span className="text-right text-gray-800">{formatPos(row.position)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeDetailView === "countries" && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="grid grid-cols-[1fr_120px] gap-2 bg-gray-50 px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase">
              <span>Country</span>
              <span className="text-right">Active User</span>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {countriesData.map((row) => {
                const pct = ((row.clicks || 0) / maxCountryClicks) * 100;
                const countryCode = (row.country || "").toLowerCase();
                return (
                  <div key={row.country} className="px-4 py-2.5 text-sm border-t border-gray-100">
                    <div className="grid grid-cols-[1fr_120px] gap-2 mb-1">
                      <span className="text-gray-800">{COUNTRY_NAMES[countryCode] || row.country.toUpperCase()}</span>
                      <span className="text-right text-gray-800">{formatNum(row.clicks)}</span>
                    </div>
                    <div className="h-1.5 rounded bg-gray-100">
                      <div className="h-1.5 rounded bg-[#31c655]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeDetailView === "keywords" && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="grid grid-cols-[1fr_90px_110px_90px_90px] gap-2 bg-gray-50 px-4 py-2 text-[11px] font-semibold text-gray-600 uppercase">
              <span>Keyword</span>
              <span className="text-right">Clicks</span>
              <span className="text-right">Impressions</span>
              <span className="text-right">CTR</span>
              <span className="text-right">Position</span>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {keywordsData.map((row) => (
                <div key={row.query} className="grid grid-cols-[1fr_90px_110px_90px_90px] gap-2 px-4 py-2.5 text-sm border-t border-gray-100">
                  <span className="truncate text-gray-800">{row.query}</span>
                  <span className="text-right text-gray-800">{formatNum(row.clicks)}</span>
                  <span className="text-right text-gray-800">{formatNum(row.impressions)}</span>
                  <span className="text-right text-gray-800">{formatPct(row.ctr)}</span>
                  <span className="text-right text-gray-800">{formatPos(row.position)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-[#ffffff] p-5">
      <h2 className="text-[28px] font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="border-t border-gray-200 mb-4" />

      {showApprovalsTab && (
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setMainTab("overview")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${
              mainTab === "overview"
                ? "bg-[#dff7de] border-[#b6ddb1] text-gray-900"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FiGlobe className="w-4 h-4" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setMainTab("approvals")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border relative ${
              mainTab === "approvals"
                ? "bg-[#dff7de] border-[#b6ddb1] text-gray-900"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FiClipboard className="w-4 h-4" />
            Approvals
            {approvalOpenCount > 0 && (
              <span className="ml-1 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                {approvalOpenCount > 9 ? "9+" : approvalOpenCount}
              </span>
            )}
          </button>
        </div>
      )}

      {showApprovalsTab && mainTab === "approvals" ? (
        <ApprovalsUserPanel />
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={fetchData}
          className="inline-flex items-center justify-center h-8 w-8 border border-gray-300 rounded bg-white text-gray-600"
          aria-label="Refresh"
          title="Refresh"
        >
          <FiRefreshCw className={`${loading ? "animate-spin" : ""} w-3.5 h-3.5`} />
        </button>
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setRange(option.id)}
            className={`px-3 py-1.5 text-xs border rounded inline-flex items-center gap-1 ${
              range === option.id ? "bg-[#d7efd4] border-[#b6ddb1] text-gray-900" : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            {range === option.id && <FiCheckSquare className="w-3 h-3 text-[#2fb54a]" />}
            {option.label}
          </button>
        ))}
        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-600">
          more
          <FiChevronDown className="w-3 h-3" />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-gray-200 rounded overflow-hidden bg-white mb-4">
        <MetricCard
          label="Total Clicks"
          value={formatNum(payload?.totals?.clicks)}
          checked={activeMetrics.clicks}
          color="text-[#2fb54a]"
          bg="bg-[#dff7de]"
          onToggle={() => toggleMetric("clicks")}
        />
        <MetricCard
          label="Total Impressions"
          value={formatCompact(payload?.totals?.impressions)}
          checked={activeMetrics.impressions}
          color="text-[#8d85c5]"
          bg="bg-[#e7e5f7]"
          onToggle={() => toggleMetric("impressions")}
        />
        <MetricCard
          label="Average CTR"
          value={formatPct(payload?.totals?.averageCtr)}
          checked={activeMetrics.ctr}
          color="text-gray-7000"
          bg="bg-white"
          onToggle={() => toggleMetric("ctr")}
        />
        <MetricCard
          label="Average Position"
          value={formatPos(payload?.totals?.averagePosition)}
          checked={activeMetrics.position}
          color="text-gray-700"
          bg="bg-white"
          onToggle={() => toggleMetric("position")}
        />
      </div>

      <div className="mb-5">
        <div className="text-xs text-gray-500 mb-2">Last Updated: {getTimeAgo(payload?.lastUpdated)}</div>
        <div className="h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#efefef" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#777" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#777" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#777" }} />
              <Tooltip />
              {activeMetrics.clicks && <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#34a853" strokeWidth={2} dot={false} />}
              {activeMetrics.impressions && <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#7c7abc" strokeWidth={1.8} dot={false} />}
              {activeMetrics.ctr && <Line yAxisId="left" type="monotone" dataKey="ctr" stroke="#f59e0b" strokeWidth={2} dot={false} />}
              {activeMetrics.position && <Line yAxisId="left" type="monotone" dataKey="position" stroke="#6b7280" strokeWidth={2} dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="flex items-center justify-between text-[13px] font-medium text-gray-700 mb-3">
            <span>Views by page title and screens</span>
            <FiChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="grid grid-cols-[1fr_56px_58px] gap-2 text-[10px] font-semibold text-gray-500 uppercase border-b border-gray-200 pb-1.5 mb-1.5">
            <span>Page Title And Screens</span>
            <span className="text-right">Views</span>
            <span className="text-right">Trend</span>
          </div>
          <div className="space-y-1">
            {(payload?.topPages?.pages || []).slice(0, 7).map((row) => (
              <div key={row.page} className="grid grid-cols-[1fr_56px_58px] gap-2 items-center text-xs border-b border-gray-100 pb-1.5">
                <span className="text-gray-800">{shortLabel(row.page)}</span>
                <span className="text-right text-gray-800">{formatNum(row.clicks)}</span>
                <span className={`inline-flex justify-end items-center gap-0.5 ${row.ctr >= 0.05 ? "text-[#2fb54a]" : "text-red-500"}`}>
                  {row.ctr >= 0.05 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                  {pctChangeFromCtr(row.ctr)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 text-[11px]">
            <span className="text-gray-500">Last 7 days</span>
            <button
              type="button"
              onClick={() => setActiveDetailView("pages")}
              className="text-[#2fb54a] font-medium inline-flex items-center gap-1"
            >
              View pages and screens
              <FiArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="flex items-center justify-between text-[13px] font-medium text-gray-700 mb-3">
            <span>Active User</span>
            <span className="inline-flex items-center gap-1 text-gray-600 text-[12px]">
              By Country ID
              <FiChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="grid grid-cols-[1.2fr_1fr] gap-3">
            <div className="rounded border border-gray-100 bg-[#fafafa] p-2 h-[160px] flex items-center justify-center">
              <svg viewBox="0 0 320 170" className="w-full h-full">
                <path d="M20 95 L45 80 L70 85 L82 102 L60 120 L30 118 Z" fill="#d1d5db" />
                <path d="M95 55 L125 40 L170 42 L200 60 L190 88 L150 86 L130 72 Z" fill="#d1d5db" />
                <path d="M170 90 L210 88 L228 100 L220 118 L186 120 L170 108 Z" fill="#d1d5db" />
                <path d="M235 55 L286 62 L295 84 L280 110 L240 96 Z" fill="#d1d5db" />
                <path d="M118 104 L138 112 L146 146 L128 160 L112 146 Z" fill="#d1d5db" />
                <path d="M36 90 L60 86 L78 96 L66 116 L40 112 Z" fill="#2ee04f" />
                <path d="M120 110 L140 120 L146 145 L128 156 L116 140 Z" fill="#2ee04f" />
              </svg>
            </div>
            <div>
              <div className="grid grid-cols-[1fr_62px] gap-2 text-[10px] font-semibold text-gray-500 uppercase border-b border-gray-200 pb-1.5 mb-1.5">
                <span>Country</span>
                <span className="text-right">Active User</span>
              </div>
              <div className="space-y-1.5">
                {(payload?.topCountries?.countries || []).slice(0, 7).map((row) => {
                  const pct = ((row.clicks || 0) / maxCountryClicks) * 100;
                  const countryCode = (row.country || "").toLowerCase();
                  return (
                    <div key={row.country} className="text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-gray-800">{COUNTRY_NAMES[countryCode] || row.country.toUpperCase()}</span>
                        <span className="text-gray-800">{formatNum(row.clicks)}</span>
                      </div>
                      <div className="h-1 rounded bg-gray-100">
                        <div className="h-1 rounded bg-[#31c655]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 text-[11px]">
            <span className="text-gray-500">Last 7 days</span>
            <button
              type="button"
              onClick={() => setActiveDetailView("countries")}
              className="text-[#2fb54a] font-medium inline-flex items-center gap-1"
            >
              View Countries
              <FiArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="flex items-center justify-between text-[13px] font-medium text-gray-700 mb-3">
            <span>Keywords</span>
            <span className="inline-flex items-center gap-1 text-gray-600 text-[12px]">
              By Ranking
              <FiChevronDown className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="grid grid-cols-[1fr_64px_58px] gap-2 text-[10px] font-semibold text-gray-500 uppercase border-b border-gray-200 pb-1.5 mb-1.5">
            <span>Keywords</span>
            <span className="text-right">Sessions</span>
            <span className="text-right">Trend</span>
          </div>
          <div className="space-y-1">
            {(payload?.topQueries?.queries || []).slice(0, 7).map((row) => (
              <div key={row.query} className="grid grid-cols-[1fr_64px_58px] gap-2 items-center text-xs border-b border-gray-100 pb-1.5">
                <span className="inline-flex items-center gap-1 text-gray-800">
                  <FiSearch className="text-gray-400 w-3 h-3" />
                  {shortLabel(row.query)}
                </span>
                <span className="text-right text-gray-800">{formatNum(row.clicks)}</span>
                <span className={`inline-flex justify-end items-center gap-0.5 ${row.ctr >= 0.05 ? "text-[#2fb54a]" : "text-red-500"}`}>
                  {row.ctr >= 0.05 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                  {pctChangeFromCtr(row.ctr)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 text-[11px]">
            <span className="text-gray-500">Last 7 days</span>
            <button
              type="button"
              onClick={() => setActiveDetailView("keywords")}
              className="text-[#2fb54a] font-medium inline-flex items-center gap-1"
            >
              View more keywords
              <FiArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, checked, color, bg, onToggle }) {
  return (
    <button onClick={onToggle} className={`text-left px-4 py-3 border-r border-gray-200 ${bg} min-h-[108px]`}>
      <div className="flex items-center gap-2 mb-1 text-xs">
        {checked ? <FiCheckSquare className={color} /> : <FiSquare className="text-gray-400" />}
        <span className={`${checked ? color : "text-gray-600"} font-medium`}>{label}</span>
      </div>
      <div className="flex items-end justify-between mt-1">
        <p className="text-[34px] leading-none font-medium text-gray-900">{value}</p>
        <FiInfo className="w-3.5 h-3.5 text-gray-500" />
      </div>
    </button>
  );
}

