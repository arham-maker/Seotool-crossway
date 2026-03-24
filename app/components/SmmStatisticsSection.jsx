"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Area, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FiGlobe, FiRefreshCw } from "react-icons/fi";

const RANGE_OPTIONS = [
  { id: "7d", label: "7 days" },
  { id: "28d", label: "28 days" },
  { id: "3m", label: "3 months" },
  { id: "12m", label: "12 months" },
];

const PLATFORM_OPTIONS = [
  { id: "all", label: "All platforms" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "tiktok", label: "TikTok" },
];

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatCompact(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    Number(value || 0)
  );
}

function platformLabel(platform) {
  const key = String(platform || "").toLowerCase();
  if (key === "youtube") return "YouTube";
  if (key === "x") return "X";
  if (key === "facebook") return "Facebook";
  if (key === "instagram") return "Instagram";
  return key || "Platform";
}

function metricLabel(platform) {
  return "Followers";
}

function accountDisplayName(accountName, accountHandle, platform) {
  const raw = String(accountHandle || "").trim();
  if (raw) {
    if (raw.startsWith("@")) return raw.slice(1).trim();
    try {
      const parsed = new URL(raw);
      const first = parsed.pathname.split("/").filter(Boolean)[0] || "";
      if (first.startsWith("@")) return first.slice(1).trim();
      if (first) return first.trim();
    } catch {
      return raw.replace(/^@/, "").trim();
    }
  }
  return String(accountName || platformLabel(platform)).trim();
}

function platformMark(platform) {
  const key = String(platform || "").toLowerCase();
  if (key === "facebook") return "f";
  if (key === "instagram") return "ig";
  if (key === "youtube") return "▶";
  if (key === "x") return "x";
  return "•";
}

function formatPct(value) {
  const v = Number(value || 0);
  if (!Number.isFinite(v)) return "+0.00%";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildMonthlySeries(timeSeries = []) {
  const base = MONTH_LABELS.map((month) => ({ month, reels: 0, posts: 0 }));
  for (const row of timeSeries) {
    const value = String(row.date || "");
    let monthIndex = -1;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      monthIndex = Number(value.slice(5, 7)) - 1;
    } else if (/^\d{2}-\d{2}$/.test(value)) {
      monthIndex = Number(value.slice(0, 2)) - 1;
    }
    if (monthIndex < 0 || monthIndex > 11) continue;
    base[monthIndex].reels += Number(row.reach || 0);
    base[monthIndex].posts += Number(row.engagements || 0);
  }
  return base;
}

function AnalyticsTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const reels = Number(payload.find((p) => p.dataKey === "reels")?.value || 0);
  const posts = Number(payload.find((p) => p.dataKey === "posts")?.value || 0);
  return (
    <div className="rounded-md border border-gray-200 bg-white/95 shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}, 2025</p>
      <div className="flex items-center justify-between gap-5 text-gray-600">
        <span>Reach</span>
        <span className="font-medium text-gray-800">{formatNumber(reels)} ↑</span>
      </div>
      <div className="flex items-center justify-between gap-5 text-gray-600 mt-1">
        <span>Engagements</span>
        <span className="font-medium text-gray-800">{formatNumber(posts)} ↑</span>
      </div>
    </div>
  );
}

export default function SmmStatisticsSection({ selectedSite = "" }) {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const ownSite = session?.user?.siteLink || "";

  const [range, setRange] = useState("3m");
  const [platform, setPlatform] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const activeSite = isSuperAdmin ? (selectedSite || ownSite) : ownSite;

  const fetchStats = useCallback(async () => {
    if (!activeSite) {
      setPayload(null);
      setError("No site selected. Please integrate a site first.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({
        range,
        platform,
        ...(isSuperAdmin ? { url: activeSite } : {}),
      });
      const res = await fetch(`/api/smm/stats?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load SMM statistics");
      }
      setPayload(data);
    } catch (err) {
      setError(err.message || "Failed to load SMM statistics");
    } finally {
      setLoading(false);
    }
  }, [activeSite, isSuperAdmin, platform, range]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const cards = payload?.platformCards || [];
  const timeSeries = payload?.timeSeries || [];
  const accounts = payload?.accounts || [];
  const setup = payload?.setup || null;

  const totalFollowers = useMemo(
    () => cards.reduce((sum, card) => sum + Number(card.followers || 0), 0),
    [cards]
  );
  const monthlyChartData = useMemo(() => buildMonthlySeries(timeSeries), [timeSeries]);
  const topCards = useMemo(() => {
    const order = ["facebook", "instagram", "youtube", "x"];
    return [...cards].sort((a, b) => {
      const ai = order.indexOf(String(a.platform || "").toLowerCase());
      const bi = order.indexOf(String(b.platform || "").toLowerCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [cards]);

  return (
    <div className="rounded-xl border border-gray-200 bg-[#ffffff] p-5 min-h-[calc(100vh-2rem)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[26px] font-semibold text-gray-900">Social Media Marketing Statistics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Site: {activeSite || "-"} {setup?.gtmContainerId ? `• GTM: ${setup.gtmContainerId}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setRange(option.id)}
              className={`px-3 py-1.5 rounded-md border text-sm ${
                range === option.id
                  ? "bg-[#dff7de] border-[#c4edc2] text-gray-900"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm bg-white"
          >
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-700 bg-white"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="h-72 flex items-center justify-center text-sm text-gray-500">Loading SMM stats...</div>
      ) : (
        <>
          <div className="mt-4">
            {topCards.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Platforms</span>
                  <span className="text-[11px] font-semibold text-green-600">Platforms +</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-gray-200 bg-[#f9f9f9] rounded-sm overflow-hidden">
                  {topCards.map((card) => (
                    <div
                      key={`${card.platform}-${card.accountName}`}
                      className="px-3 py-2.5 border-r border-gray-200 last:border-r-0"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-gray-700">{platformLabel(card.platform)}</p>
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            card.deltaFollowers >= 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {card.deltaFollowers >= 0 ? "↑" : "↓"} {Math.abs(Number(card.deltaFollowers || 0)).toFixed(1)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{card.accountHandle || "@account"}</p>
                      <p className="text-[34px] leading-none font-semibold text-gray-900 mt-2">
                        {formatCompact(card.followers)}
                      </p>
                      <p className="text-[12px] text-gray-500 mt-1">{metricLabel(card.platform)}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                No platform data yet. Send stats via GTM to `/api/smm/collect`.
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Post/Reels Analytics</p>
              <div className="flex items-center gap-3 text-[11px] text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#33d56a]" />
                  Reels
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#7a79d8]" />
                  Posts
                </span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="reelsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#39d86e" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#39d86e" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7a79d8" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#7a79d8" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" stroke="#d7d7d7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<AnalyticsTooltip />} cursor={{ stroke: "#bfc3ca", strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="reels" stroke="transparent" fill="url(#reelsGradient)" />
                  <Area type="monotone" dataKey="posts" stroke="transparent" fill="url(#postsGradient)" />
                  <Line
                    type="monotone"
                    dataKey="reels"
                    stroke="#33d56a"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 3, fill: "#33d56a" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    stroke="#7a79d8"
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 3, fill: "#7a79d8" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">Followers total: {formatNumber(totalFollowers)}</p>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 overflow-hidden bg-white">
            <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] px-4 py-3 text-[11px] font-semibold text-gray-700 border-b border-gray-200">
              <span>Account Name</span>
              <span className="text-center">Reach</span>
              <span className="text-center">Engagements</span>
              <span className="text-center">Queued posts</span>
              <span className="text-center">Queued reels</span>
            </div>
            {accounts.length > 0 ? (
              accounts.map((row) => (
                <div
                  key={`${row.platform}-${row.accountName}`}
                  className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] px-4 py-2.5 border-b border-gray-100 last:border-b-0 text-sm"
                >
                  <span className="flex items-center gap-2 text-gray-800">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[9px] text-gray-600 font-semibold">
                      {platformMark(row.platform)}
                    </span>
                    <span className="text-[12px] text-gray-700">
                      {accountDisplayName(row.accountName, row.accountHandle, row.platform)}
                    </span>
                  </span>
                  <span className="text-center text-gray-800">
                    <span className="text-[12px]">{formatNumber(row.reach)}</span>
                    <span className="ml-1 text-[10px] text-green-600">↑ {formatPct(row.reachChangePct)}</span>
                  </span>
                  <span className="text-center text-gray-800">
                    <span className="text-[12px]">{formatNumber(row.engagements)}</span>
                    <span className="ml-1 text-[10px] text-green-600">↑ {formatPct(row.engagementsChangePct)}</span>
                  </span>
                  <span className="text-center text-[12px] text-gray-800">{formatNumber(row.queuedPosts)}</span>
                  <span className="text-center text-[12px] text-gray-800">{formatNumber(row.queuedReels)}</span>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-gray-500">No SMM account rows available for this filter.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

