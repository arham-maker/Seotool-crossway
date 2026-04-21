"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheck, FiX, FiRefreshCw, FiChevronDown, FiChevronUp } from "react-icons/fi";

export default function ApprovalsUserPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load approvals");
      setItems(data.approvals || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleOpen = (a) => {
    if (openId === a.id) {
      setOpenId(null);
      return;
    }
    setOpenId(a.id);
  };

  const patch = async (id, payload) => {
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      await load();
      setOpenId(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("approvals:user-updated"));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="inline-block h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Review items from your administrator (heading and image). You can approve or decline each item.
        </p>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-lg px-2 py-1 bg-white shrink-0"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-10 text-center text-sm text-gray-500">
          No approvals assigned to you yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const open = openId === a.id;
            const closed = a.status === "approved" || a.status === "declined";
            const canAct = a.status === "pending" || a.status === "edited";
            return (
              <li key={a.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleOpen(a)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/80"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{a.title}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">
                      {a.status}
                      {closed && a.respondedAt ? ` · ${new Date(a.respondedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  {open ? <FiChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <FiChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                    <div className="rounded-lg border border-gray-100 overflow-hidden bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.imagePath}
                        alt=""
                        className="w-full max-h-[320px] object-contain bg-white"
                      />
                    </div>
                    {canAct && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => patch(a.id, { action: "approve" })}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0EFF2A] hover:bg-[#0BCC22] text-white text-sm font-semibold disabled:opacity-50"
                        >
                          <FiCheck className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => patch(a.id, { action: "decline" })}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          <FiX className="w-4 h-4" />
                          Decline
                        </button>
                      </div>
                    )}
                    {closed && (
                      <p className="text-xs text-gray-500">
                        This item is closed. Contact your administrator if you need changes.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
