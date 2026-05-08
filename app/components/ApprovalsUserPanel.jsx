"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheck, FiEdit2, FiX, FiRefreshCw, FiChevronDown, FiChevronUp } from "react-icons/fi";
import ApprovalMediaPreview from "./ApprovalMediaPreview";

function displayBody(a) {
  if (a.userEditedText && String(a.userEditedText).trim()) return a.userEditedText;
  return a.bodyText || "";
}

/** Row headline: prefer persisted user caption/editorial text, then admin title. */
function displayHeadline(a) {
  const fromBody = String(displayBody(a) || "").trim();
  if (fromBody) return fromBody;
  return String(a.title || "").trim() || "Approval";
}

export default function ApprovalsUserPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
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
      setEditDraft("");
      return;
    }
    setOpenId(a.id);
    setEditDraft(displayBody(a));
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
      setEditDraft("");
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
          Review the heading and media from your administrator. You can edit the <strong>text</strong> only (media stays
          fixed), then approve, save your edit, or decline. Items your administrator marked as approved on assignment do
          not appear here — no action needed from you.
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
            const bodyShown = displayBody(a);
            return (
              <li key={a.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleOpen(a)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/80"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{displayHeadline(a)}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">
                      {a.status}
                      {closed && a.respondedAt ? ` · ${new Date(a.respondedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  {open ? (
                    <FiChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                  ) : (
                    <FiChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                    <div className="rounded-lg border border-gray-100 overflow-hidden bg-gray-50">
                      <ApprovalMediaPreview
                        src={a.imagePath}
                        className="w-full max-h-[320px] object-contain bg-black"
                        videoControls
                      />
                    </div>
                    {bodyShown ? (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Current text</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{bodyShown}</p>
                      </div>
                    ) : null}
                    {canAct && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Edit text only (media cannot be changed)
                          </label>
                          <textarea
                            rows={4}
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() =>
                              patch(a.id, {
                                action: "approve",
                                editedText: editDraft,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0EFF2A] hover:bg-[#0BCC22] text-white text-sm font-semibold disabled:opacity-50"
                          >
                            <FiCheck className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => patch(a.id, { action: "edit", editedText: editDraft })}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-800 text-sm font-semibold disabled:opacity-50"
                          >
                            <FiEdit2 className="w-4 h-4" />
                            Save edit
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
                      </>
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
