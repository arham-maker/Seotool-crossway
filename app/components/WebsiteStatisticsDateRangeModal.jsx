"use client";

import { useState, useEffect, useId } from "react";
import { getComparePresetRanges, getDateRangeForPresetId } from "../../lib/searchConsoleDateRanges";

const FILTER_PRESETS = [
  { id: "7d", label: "Last 7 days" },
  { id: "28d", label: "Last 28 days" },
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
  { id: "16m", label: "Last 16 months" },
];

const COMPARE_PRESETS = [
  { id: "c7d_prev", label: "Compare last 7 days to previous period" },
  { id: "c7d_yoy", label: "Compare last 7 days year over year" },
  { id: "c28d_prev", label: "Compare last 28 days to previous period" },
  { id: "c28d_yoy", label: "Compare last 28 days year over year" },
  { id: "c3m_prev", label: "Compare last 3 months to previous period" },
  { id: "c3m_yoy", label: "Compare last 3 months year over year" },
  { id: "c6m_prev", label: "Compare last 6 months to previous period" },
  { id: "c6m_yoy", label: "Compare last 6 months year over year" },
];

const compareFields = (sel) => {
  if (sel.comparePreset === "custom") {
    return {
      a: { start: sel.pStart, end: sel.pEnd },
      b: { start: sel.cStart, end: sel.cEnd },
    };
  }
  const r = getComparePresetRanges(sel.comparePreset, new Date());
  if (!r) {
    return {
      a: { start: "", end: "" },
      b: { start: "", end: "" },
    };
  }
  return { a: r.primary, b: r.compare };
};

export function formatDisplayRange(start, end) {
  if (!start || !end) return "Date range";
  if (start === end) {
    return start;
  }
  return `${start} \u2013 ${end}`;
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {function} props.onApply — (payload) => void
 * @param {{ filterPreset: string, comparePreset?: string, customStart?: string, customEnd?: string, pStart?: string, pEnd?: string, cStart?: string, cEnd?: string }} [props.initial]
 * @param {"filter"|"compare"} [props.defaultTab]
 */
export default function WebsiteStatisticsDateRangeModal({ open, onClose, onApply, initial, defaultTab = "filter" }) {
  const titleId = useId();
  const [tab, setTab] = useState(defaultTab);
  const [filterPreset, setFilterPreset] = useState("28d");
  const [comparePreset, setComparePreset] = useState("c3m_prev");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [pStart, setPStart] = useState("");
  const [pEnd, setPEnd] = useState("");
  const [cStart, setCStart] = useState("");
  const [cEnd, setCEnd] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab(defaultTab);
    if (initial?.filterPreset) setFilterPreset(initial.filterPreset);
    if (initial?.comparePreset) setComparePreset(initial.comparePreset);
    if (initial?.customStart) setCustomStart(initial.customStart);
    if (initial?.customEnd) setCustomEnd(initial.customEnd);
    if (initial?.pStart) setPStart(initial.pStart);
    if (initial?.pEnd) setPEnd(initial.pEnd);
    if (initial?.cStart) setCStart(initial.cStart);
    if (initial?.cEnd) setCEnd(initial.cEnd);
  }, [open, initial, defaultTab]);

  // Keep compare date preview in sync with preset
  useEffect(() => {
    if (tab !== "compare" || comparePreset === "custom") return;
    const r = getComparePresetRanges(comparePreset, new Date());
    if (r) {
      setPStart(r.primary.startDate);
      setPEnd(r.primary.endDate);
      setCStart(r.compare.startDate);
      setCEnd(r.compare.endDate);
    }
  }, [tab, comparePreset]);

  // Filter tab: custom YYYY-MM-DD defaults when user picks "Custom"
  useEffect(() => {
    if (tab !== "filter" || filterPreset !== "custom") return;
    if (customStart && customEnd) return;
    const r = getDateRangeForPresetId("3m", new Date());
    setCustomStart((s) => s || r.startDate);
    setCustomEnd((e) => e || r.endDate);
  }, [tab, filterPreset, customStart, customEnd]);

  // Compare tab: custom: seed four fields once
  useEffect(() => {
    if (tab !== "compare" || comparePreset !== "custom") return;
    if (pStart && pEnd && cStart && cEnd) return;
    const r = getComparePresetRanges("c3m_prev", new Date());
    if (r) {
      setPStart((s) => s || r.primary.startDate);
      setPEnd((e) => e || r.primary.endDate);
      setCStart((s) => s || r.compare.startDate);
      setCEnd((e) => e || r.compare.endDate);
    }
  }, [tab, comparePreset, pStart, pEnd, cStart, cEnd]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const applyDisabledFilter = (() => {
    if (filterPreset !== "custom") return false;
    return !customStart || !customEnd || customStart > customEnd;
  })();

  const applyDisabledCompare = (() => {
    if (!pStart || !pEnd || !cStart || !cEnd) return true;
    if (pStart > pEnd || cStart > cEnd) return true;
    return false;
  })();

  const handleApply = () => {
    if (tab === "filter") {
      if (applyDisabledFilter) return;
      if (filterPreset === "custom") {
        onApply({
          kind: "filter",
          filterPreset: "custom",
          startDate: customStart,
          endDate: customEnd,
        });
      } else {
        onApply({
          kind: "filter",
          filterPreset,
        });
      }
    } else {
      if (applyDisabledCompare) return;
      onApply({
        kind: "compare",
        startDate: pStart,
        endDate: pEnd,
        compareStart: cStart,
        compareEnd: cEnd,
        compareLabel: comparePreset,
      });
    }
    onClose();
  };

  const compPreview = compareFields({ comparePreset, pStart, pEnd, cStart, cEnd });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100">
          <h2 id={titleId} className="text-lg font-medium text-gray-900">
            Date range
          </h2>
          <div className="flex gap-4 mt-3 text-sm">
            <button
              type="button"
              onClick={() => setTab("filter")}
              className={`pb-1 border-b-2 -mb-px ${
                tab === "filter"
                  ? "border-blue-600 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() => setTab("compare")}
              className={`pb-1 border-b-2 -mb-px ${
                tab === "compare"
                  ? "border-blue-600 text-gray-900 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Compare
            </button>
          </div>
        </div>

        <div className="p-4 max-h-[min(70vh,520px)] overflow-y-auto">
          {tab === "filter" && (
            <div className="space-y-0">
              {FILTER_PRESETS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 py-2.5 text-sm text-gray-800 border-b border-gray-50 first:pt-0 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="filterType"
                    checked={filterPreset === opt.id}
                    onChange={() => {
                      setFilterPreset(opt.id);
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  {opt.label}
                </label>
              ))}
              <label className="flex items-center gap-2 py-2.5 text-sm text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="filterType"
                  checked={filterPreset === "custom"}
                  onChange={() => setFilterPreset("custom")}
                  className="h-4 w-4 text-blue-600"
                />
                Custom
              </label>
              {filterPreset === "custom" && (
                <div className="pl-6 pb-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 block mb-0.5">Start date</label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-[10px] text-gray-400">YYYY-MM-DD</span>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-0.5">End date</label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-[10px] text-gray-400">YYYY-MM-DD</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "compare" && (
            <div className="space-y-0">
              {COMPARE_PRESETS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 py-2.5 text-sm text-gray-800 border-b border-gray-50 first:pt-0 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="compareType"
                    checked={comparePreset === opt.id}
                    onChange={() => {
                      setComparePreset(opt.id);
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  {opt.label}
                </label>
              ))}
              <label className="flex items-center gap-2 py-2.5 text-sm text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="compareType"
                  checked={comparePreset === "custom"}
                  onChange={() => setComparePreset("custom")}
                  className="h-4 w-4 text-blue-600"
                />
                Custom
              </label>
              {comparePreset !== "custom" && (compPreview.a.start || compPreview.b.start) && (
                <div className="mt-3 space-y-2.5">
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3.5 shadow-sm">
                    <p className="text-xs font-medium text-gray-800 mb-2.5">Current period</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded border border-gray-200 bg-white px-2.5 py-1.5">
                        <span className="text-[10px] text-gray-500 block mb-0.5">Start date</span>
                        <span className="text-sm font-mono text-gray-900 tabular-nums">
                          {compPreview.a.start || "—"}
                        </span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">YYYY-MM-DD</span>
                      </div>
                      <div className="rounded border border-gray-200 bg-white px-2.5 py-1.5">
                        <span className="text-[10px] text-gray-500 block mb-0.5">End date</span>
                        <span className="text-sm font-mono text-gray-900 tabular-nums">
                          {compPreview.a.end || "—"}
                        </span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">YYYY-MM-DD</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm font-medium text-gray-500 py-0.5">vs.</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3.5 shadow-sm">
                    <p className="text-xs font-medium text-gray-800 mb-2.5">Compare to</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded border border-gray-200 bg-white px-2.5 py-1.5">
                        <span className="text-[10px] text-gray-500 block mb-0.5">Start date</span>
                        <span className="text-sm font-mono text-gray-900 tabular-nums">
                          {compPreview.b.start || "—"}
                        </span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">YYYY-MM-DD</span>
                      </div>
                      <div className="rounded border border-gray-200 bg-white px-2.5 py-1.5">
                        <span className="text-[10px] text-gray-500 block mb-0.5">End date</span>
                        <span className="text-sm font-mono text-gray-900 tabular-nums">
                          {compPreview.b.end || "—"}
                        </span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">YYYY-MM-DD</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {comparePreset === "custom" && (
                <div className="mt-3 space-y-2.5">
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3.5 shadow-sm">
                    <p className="text-xs font-medium text-gray-800 mb-2.5">Current period</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-600 block mb-0.5">Start date</label>
                        <input
                          type="date"
                          value={pStart}
                          onChange={(e) => setPStart(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-md bg-white px-2 py-2 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-[9px] text-gray-400">YYYY-MM-DD</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 block mb-0.5">End date</label>
                        <input
                          type="date"
                          value={pEnd}
                          onChange={(e) => setPEnd(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-md bg-white px-2 py-2 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-[9px] text-gray-400">YYYY-MM-DD</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sm font-medium text-gray-500 py-0.5">vs.</p>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3.5 shadow-sm">
                    <p className="text-xs font-medium text-gray-800 mb-2.5">Compare to</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-600 block mb-0.5">Start date</label>
                        <input
                          type="date"
                          value={cStart}
                          onChange={(e) => setCStart(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-md bg-white px-2 py-2 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-[9px] text-gray-400">YYYY-MM-DD</span>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 block mb-0.5">End date</label>
                        <input
                          type="date"
                          value={cEnd}
                          onChange={(e) => setCEnd(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-md bg-white px-2 py-2 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-[9px] text-gray-400">YYYY-MM-DD</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={tab === "filter" ? applyDisabledFilter : applyDisabledCompare}
            className="text-sm font-medium px-4 py-2 rounded-full bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

