"use client";

import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import {
  getFilterRangeFromPreset,
  getCompareRangesFromPreset,
  getTodayYmd,
} from "../../lib/websiteStatsDateRange";

const FILTER_PRESETS = [
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
  { id: "16m", label: "Last 16 months" },
  { id: "custom", label: "Custom" },
];

const COMPARE_PRESETS = [
  { id: "1d_prev", label: "Compare last 24 hours to previous period" },
  { id: "1d_wow", label: "Compare last 24 hours week over week" },
  { id: "7d_prev", label: "Compare last 7 days to previous period" },
  { id: "7d_yoy", label: "Compare last 7 days year over year" },
  { id: "28d_prev", label: "Compare last 28 days to previous period" },
  { id: "28d_yoy", label: "Compare last 28 days year over year" },
  { id: "3m_prev", label: "Compare last 3 months to previous period" },
  { id: "3m_yoy", label: "Compare last 3 months year over year" },
  { id: "6m_prev", label: "Compare last 6 months to previous period" },
  { id: "6m_yoy", label: "Compare last 6 months year over year" },
  { id: "12m_prev", label: "Compare last 12 months to previous period" },
  { id: "12m_yoy", label: "Compare last 12 months year over year" },
  { id: "custom", label: "Custom" },
];

const defaultFilterCustom = () => {
  const e = getTodayYmd();
  return { start: e, end: e };
};

const defaultCompareCustom = () => {
  const r = getCompareRangesFromPreset("3m_prev", null);
  return {
    primaryStart: r.startDate,
    primaryEnd: r.endDate,
    compareStart: r.compareStart,
    compareEnd: r.compareEnd,
  };
};

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {object | null} props.applied — { type, range?, startDate?, endDate?, compareStart?, compareEnd? }
 * @param {(config: object) => void} props.onApply
 */
export default function WebsiteStatsDateRangeModal({ open, onClose, onApply, applied }) {
  const [tab, setTab] = useState("filter");
  const [filterPreset, setFilterPreset] = useState("6m");
  const [filterStart, setFilterStart] = useState(defaultFilterCustom().start);
  const [filterEnd, setFilterEnd] = useState(defaultFilterCustom().end);
  const [comparePreset, setComparePreset] = useState("3m_prev");
  const [cPrimaryStart, setCPrimaryStart] = useState("");
  const [cPrimaryEnd, setCPrimaryEnd] = useState("");
  const [cCompareStart, setCCompareStart] = useState("");
  const [cCompareEnd, setCCompareEnd] = useState("");

  useEffect(() => {
    if (!open) return;
    if (applied?.type === "compare" && applied.compareStart) {
      setTab("compare");
      setCPrimaryStart(applied.startDate);
      setCPrimaryEnd(applied.endDate);
      setCCompareStart(applied.compareStart);
      setCCompareEnd(applied.compareEnd);
      setComparePreset("custom");
    } else if (applied?.type === "filter" && applied.startDate) {
      setTab("filter");
      setFilterPreset("custom");
      setFilterStart(applied.startDate);
      setFilterEnd(applied.endDate);
    } else if (applied?.type === "filter" && applied.range) {
      setTab("filter");
      const inList = ["6m", "12m", "16m"].includes(applied.range);
      if (inList) {
        setFilterPreset(applied.range);
      } else {
        const r = getFilterRangeFromPreset(applied.range, null, null);
        setFilterPreset("custom");
        setFilterStart(r.startDate);
        setFilterEnd(r.endDate);
      }
    } else {
      setTab("filter");
      setFilterPreset("6m");
      const d = defaultFilterCustom();
      setFilterStart(d.start);
      setFilterEnd(d.end);
    }
  }, [open, applied]);

  useEffect(() => {
    if (!open || tab !== "compare" || comparePreset === "custom") return;
    const r = getCompareRangesFromPreset(comparePreset, null);
    setCPrimaryStart(r.startDate);
    setCPrimaryEnd(r.endDate);
    setCCompareStart(r.compareStart);
    setCCompareEnd(r.compareEnd);
  }, [open, tab, comparePreset]);

  const handleApply = () => {
    if (tab === "filter") {
      if (filterPreset === "custom") {
        onApply({
          type: "filter",
          startDate: filterStart,
          endDate: filterEnd,
        });
      } else {
        onApply({ type: "filter", range: filterPreset });
      }
    } else {
      if (comparePreset === "custom") {
        onApply({
          type: "compare",
          startDate: cPrimaryStart,
          endDate: cPrimaryEnd,
          compareStart: cCompareStart,
          compareEnd: cCompareEnd,
        });
      } else {
        const r = getCompareRangesFromPreset(comparePreset, null);
        onApply({
          type: "compare",
          startDate: r.startDate,
          endDate: r.endDate,
          compareStart: r.compareStart,
          compareEnd: r.compareEnd,
        });
      }
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wstats-date-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 id="wstats-date-title" className="text-lg font-medium text-gray-900">
            Date range
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setTab("filter")}
              className={`pb-2.5 text-sm font-medium ${
                tab === "filter"
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() => setTab("compare")}
              className={`pb-2.5 text-sm font-medium ${
                tab === "compare"
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Compare
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex-1 min-h-0">
          {tab === "filter" && (
            <div className="space-y-3">
              {FILTER_PRESETS.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 py-0.5 cursor-pointer text-sm text-gray-800"
                >
                  <input
                    type="radio"
                    name="filterPreset"
                    checked={filterPreset === p.id}
                    onChange={() => setFilterPreset(p.id)}
                    className="h-4 w-4 text-blue-600"
                  />
                  {p.label}
                </label>
              ))}
              {filterPreset === "custom" && (
                <div className="pt-2 flex flex-wrap items-end gap-2">
                  <DateField
                    label="Start date"
                    value={filterStart}
                    onChange={setFilterStart}
                  />
                  <span className="text-gray-500 pb-2">–</span>
                  <DateField
                    label="End date"
                    value={filterEnd}
                    onChange={setFilterEnd}
                  />
                </div>
              )}
            </div>
          )}

          {tab === "compare" && (
            <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
              {COMPARE_PRESETS.map((p) => (
                <label
                  key={p.id}
                  className="flex items-start gap-3 py-0.5 cursor-pointer text-sm text-gray-800 leading-snug"
                >
                  <input
                    type="radio"
                    name="comparePreset"
                    checked={comparePreset === p.id}
                    onChange={() => {
                      if (p.id === "custom") {
                        setComparePreset("custom");
                        const d = defaultCompareCustom();
                        setCPrimaryStart(d.primaryStart);
                        setCPrimaryEnd(d.primaryEnd);
                        setCCompareStart(d.compareStart);
                        setCCompareEnd(d.compareEnd);
                        return;
                      }
                      setComparePreset(p.id);
                    }}
                    className="h-4 w-4 text-blue-600 mt-0.5 shrink-0"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          )}

          {tab === "compare" && comparePreset === "custom" && (
            <div className="mt-4 space-y-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current period</p>
              <div className="flex flex-wrap items-end gap-2">
                <DateField
                  label="Start date"
                  value={cPrimaryStart}
                  onChange={setCPrimaryStart}
                />
                <span className="text-gray-500 pb-2">–</span>
                <DateField
                  label="End date"
                  value={cPrimaryEnd}
                  onChange={setCPrimaryEnd}
                />
              </div>
              <p className="text-center text-xs text-gray-500">vs</p>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Compare period</p>
              <div className="flex flex-wrap items-end gap-2">
                <DateField
                  label="Start date"
                  value={cCompareStart}
                  onChange={setCCompareStart}
                />
                <span className="text-gray-500 pb-2">–</span>
                <DateField
                  label="End date"
                  value={cCompareEnd}
                  onChange={setCCompareEnd}
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <div className="relative min-w-[140px]">
      <label className="absolute -top-2 left-2 px-1 bg-white text-xs text-gray-500 z-10">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-2 pr-2 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
      />
      <p className="text-[10px] text-gray-400 mt-0.5">YYYY-MM-DD</p>
    </div>
  );
}
