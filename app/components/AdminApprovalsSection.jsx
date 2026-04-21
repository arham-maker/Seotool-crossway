"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FiCheck,
  FiImage,
  FiRefreshCw,
  FiUser,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

const ROLES = { SUPER_ADMIN: "super_admin" };

function isSuperAdminRole(role) {
  return String(role || "").toLowerCase() === ROLES.SUPER_ADMIN;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

function userResponseSummary(a) {
  if (!a.respondedAt && a.status === "pending") {
    return { label: "Awaiting user", detail: "No response yet." };
  }
  const when = formatDateTime(a.respondedAt);
  const action = String(a.lastAction || "").toLowerCase();
  if (action === "approve" || a.status === "approved") {
    return {
      label: "Approved",
      detail: `User approved on ${when}.`,
    };
  }
  if (action === "decline" || a.status === "declined") {
    return {
      label: "Declined",
      detail: `User declined on ${when}.`,
    };
  }
  if (action === "edit" || a.status === "edited") {
    return {
      label: "Edited (legacy)",
      detail: `User submitted an update on ${when} (older approvals only).`,
    };
  }
  return {
    label: a.status || "Updated",
    detail: a.respondedAt ? `Last activity ${when}.` : "—",
  };
}

export default function AdminApprovalsSection() {
  const [users, setUsers] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [approvalsListWarning, setApprovalsListWarning] = useState("");
  const [form, setForm] = useState({
    title: "",
    assigneeUserId: "",
    imageFile: null,
  });
  const [expandedApprovalId, setExpandedApprovalId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setApprovalsListWarning("");
    try {
      const uRes = await fetch("/api/admin/users?includeInactive=true");
      const uData = await uRes.json();
      if (!uRes.ok) {
        throw new Error(uData.error || "Failed to load users");
      }
      const assignable = (uData.users || []).filter((u) => !isSuperAdminRole(u.role));
      setUsers(assignable);

      try {
        const aRes = await fetch("/api/admin/approvals");
        const aData = await aRes.json();
        if (aRes.ok) {
          setApprovals(aData.approvals || []);
        } else {
          setApprovals([]);
          setApprovalsListWarning(
            `${aData.error || "Could not load the approvals table."} Run a Prisma migration if you have not yet (for example: npx prisma migrate dev or npx prisma db push). Assigning new approvals may still work once the schema is applied.`
          );
        }
      } catch (aErr) {
        setApprovals([]);
        setApprovalsListWarning(
          `Could not load approvals (${aErr.message || "network error"}). ` +
            "Apply the approvals migration if needed; the assignee dropdown is unaffected."
        );
      }
    } catch (e) {
      setError(e.message);
      setUsers([]);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const acknowledge = async (id) => {
    try {
      const res = await fetch(`/api/admin/approvals/${id}/acknowledge`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to acknowledge");
      await load();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("approvals:admin-refresh"));
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.imageFile) {
      setError("Please choose an image.");
      return;
    }
    if (!form.assigneeUserId) {
      setError("Please select a user to assign this approval to.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("image", form.imageFile);
      fd.append("title", form.title.trim());
      fd.append("assigneeUserId", form.assigneeUserId);
      const res = await fetch("/api/admin/approvals", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create approval");
      setSuccess("Approval created and assigned.");
      setForm({ title: "", assigneeUserId: "", imageFile: null });
      await load();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("approvals:admin-refresh"));
      }
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 flex justify-center">
        <div className="inline-block h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-[#ffffff] overflow-hidden">
      <div className="px-4 sm:px-6 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Approvals</h2>
        <p className="text-sm text-gray-600 mt-1">
          Create approval items with a heading and image, assign them to a user. They appear on the user&apos;s
          dashboard under the Approvals tab. You are notified when they approve or decline.
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}
        {approvalsListWarning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {approvalsListWarning}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 p-4 space-y-4 bg-gray-50/50">
          <p className="text-sm font-semibold text-gray-900">New approval</p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Heading</label>
            <input
              type="text"
              required
              maxLength={255}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900"
              placeholder="Short title"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) =>
                setForm((f) => ({ ...f, imageFile: e.target.files?.[0] || null }))
              }
              className="w-full text-sm text-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP, or GIF — max 5 MB.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Assign to user</label>
            <select
              required
              value={form.assigneeUserId}
              onChange={(e) => setForm((f) => ({ ...f, assigneeUserId: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-900"
            >
              <option value="">
                {users.length === 0 ? "No assignable users — add users first" : "Select user…"}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {(u.name || u.email) + ` (${u.email})`}
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="mt-2 text-xs text-gray-600">
                Super Admin accounts are excluded. Create <strong>User</strong> or <strong>Viewer</strong> accounts under{" "}
                <strong>User Management</strong> if the list is empty.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl font-semibold disabled:opacity-60"
          >
            <FiImage className="w-4 h-4" />
            {submitting ? "Creating…" : "Create & assign approval"}
          </button>
        </form>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Assigned approvals</p>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1 text-sm text-gray-600 border border-gray-200 rounded-lg px-2 py-1 bg-white"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1fr_100px_80px_1fr] gap-2 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 uppercase">
              <span>User / Title</span>
              <span>Status</span>
              <span>Alert</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-gray-100">
              {approvals.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">No approvals yet.</div>
              )}
              {approvals.map((a) => {
                const expanded = expandedApprovalId === a.id;
                const summary = userResponseSummary(a);
                return (
                  <div key={a.id} className="border-b border-gray-100 last:border-b-0">
                    <div className="px-4 py-3 grid sm:grid-cols-[1fr_100px_80px_1fr] gap-2 items-center text-sm">
                      <div>
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                          <FiUser className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{a.assignee?.name || a.assignee?.email}</span>
                        </div>
                        <div className="text-gray-600 truncate mt-0.5">{a.title}</div>
                        <div className="text-xs text-gray-400 sm:hidden mt-1">
                          {a.status}
                          {a.awaitingAdminReview ? " · needs review" : ""}
                        </div>
                      </div>
                      <div className="hidden sm:block capitalize text-gray-700">{a.status}</div>
                      <div className="hidden sm:flex items-center gap-1">
                        {a.awaitingAdminReview ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-semibold">
                            <FiAlertCircle className="w-4 h-4" />
                            New
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedApprovalId(expanded ? null : a.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <>
                              <FiChevronUp className="w-3.5 h-3.5" />
                              Hide review
                            </>
                          ) : (
                            <>
                              <FiChevronDown className="w-3.5 h-3.5" />
                              Review
                            </>
                          )}
                        </button>
                        {a.awaitingAdminReview ? (
                          <button
                            type="button"
                            onClick={() => acknowledge(a.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#dff7de] text-gray-900 border border-[#c4edc2]"
                          >
                            <FiCheck className="w-3.5 h-3.5" />
                            Mark seen
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {expanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/90 space-y-4">
                        <div className="pt-3 rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            User response
                          </p>
                          <p className="text-sm font-semibold text-gray-900">{summary.label}</p>
                          <p className="text-sm text-gray-700">{summary.detail}</p>
                          <p className="text-xs text-gray-500">
                            Created {formatDateTime(a.createdAt)}
                            {a.updatedAt && a.updatedAt !== a.createdAt ? (
                              <> · Last updated {formatDateTime(a.updatedAt)}</>
                            ) : null}
                          </p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                              Image
                            </p>
                            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={a.imagePath}
                                alt=""
                                className="w-full max-h-[220px] object-contain"
                              />
                            </div>
                          </div>
                          <div className="space-y-2 min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                              Heading
                            </p>
                            <p className="text-sm font-medium text-gray-900">{a.title}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
