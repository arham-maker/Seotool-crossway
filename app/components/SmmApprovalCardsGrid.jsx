"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";

function normalizeSiteUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const path = u.pathname.replace(/\/+$/, "") || "";
    return `${u.hostname.toLowerCase()}${path}`;
  } catch {
    return s.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
  }
}

function formatCardWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Thumbnail inside black frame (approval card). */
function MediaPreview({ imagePath, title }) {
  const alt = String(title || "Post or reel preview").trim() || "Preview";
  return (
    <div className="relative w-full overflow-hidden rounded-lg border-[3px] border-black bg-black aspect-video">
      {imagePath ? (
        <img src={imagePath} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 text-sm text-neutral-400">
          No preview
        </div>
      )}
    </div>
  );
}

function ownerIdForSite(users, siteUrl) {
  const target = normalizeSiteUrl(siteUrl);
  if (!target || !Array.isArray(users)) return null;
  for (const u of users) {
    const primary = normalizeSiteUrl(u.siteLink);
    if (primary && primary === target) return u.id;
    const links = u.accessibleSites || [];
    for (const entry of links) {
      const link = typeof entry === "string" ? entry : entry?.siteLink;
      if (link && normalizeSiteUrl(link) === target) return u.id;
    }
  }
  return null;
}

/**
 * Approval cards for SMM Statistics (hidden for SMM role — parent gates rendering).
 * Super admins: approvals for the user who owns / can access the selected site.
 */
export default function SmmApprovalCardsGrid({ isSuperAdmin = false, activeSite = "" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (isSuperAdmin) {
        const [approvalsRes, usersRes] = await Promise.all([
          fetch("/api/admin/approvals"),
          fetch("/api/admin/users"),
        ]);
        const approvalsData = await approvalsRes.json();
        const usersData = await usersRes.json();
        if (!approvalsRes.ok) {
          throw new Error(approvalsData.error || "Failed to load approvals");
        }
        if (!usersRes.ok) {
          throw new Error(usersData.error || "Failed to load users");
        }
        const users = usersData.users || [];
        const all = approvalsData.approvals || [];
        const ownerId = ownerIdForSite(users, activeSite);
        if (!activeSite.trim()) {
          setItems([]);
          setError("");
          setLoading(false);
          return;
        }
        if (!ownerId) {
          setItems([]);
          setError("No user found for this site link. Assign a primary site to a user to match approvals.");
          setLoading(false);
          return;
        }
        const filtered = all
          .filter(
            (a) =>
              (a.assigneeId === ownerId || a.assignee?.id === ownerId) && !a.hiddenFromAssignee
          )
          .map((a) => ({
            id: a.id,
            title: a.title,
            imagePath: a.imagePath,
            status: a.status,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            respondedAt: a.respondedAt,
          }));
        setItems(filtered);
      } else {
        const res = await fetch("/api/approvals?smmDisplay=1");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setItems(data.approvals || []);
      }
    } catch (e) {
      setError(e.message || "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, activeSite]);

  useEffect(() => {
    load();
  }, [load]);

  const emptyHint = useMemo(() => {
    if (isSuperAdmin && !String(activeSite || "").trim()) {
      return "Select a site in the header to see that client’s approved items.";
    }
    return "No approval items assigned yet.";
  }, [isSuperAdmin, activeSite]);

  const noApprovedYetHint = useMemo(() => {
    if (isSuperAdmin && !String(activeSite || "").trim()) {
      return emptyHint;
    }
    return "Only approved items are shown here. Approve an item under Dashboard → Approvals, then refresh.";
  }, [isSuperAdmin, activeSite, emptyHint]);

  const approvedItems = useMemo(
    () =>
      items.filter(
        (a) =>
          String(a.status || "").toLowerCase() === "approved" && !a.hiddenFromAssignee
      ),
    [items]
  );

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-500">Loading approvals…</div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1 bg-white hover:bg-gray-50"
        >
          <FiRefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>
      {error && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}
      {!loading && items.length === 0 && !error ? (
        <p className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-200 rounded-xl">{emptyHint}</p>
      ) : null}
      {!loading && items.length > 0 && approvedItems.length === 0 && !error ? (
        <p className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-200 rounded-xl">
          {noApprovedYetHint}
        </p>
      ) : null}
      {approvedItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {approvedItems.map((a) => {
            const displayWhen = a.respondedAt || a.updatedAt || a.createdAt;
            return (
              <article
                key={a.id}
                className="flex flex-col rounded-2xl bg-[#F9F9F9] p-5 font-sans shadow-[0_4px_14px_rgba(0,0,0,0.08)] sm:p-6"
              >
                <header className="mb-5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-lg font-bold leading-snug text-black sm:text-xl">{a.title}</h3>
                    <p className="mt-1 text-sm font-normal leading-normal text-[#666666]">
                      {formatCardWhen(displayWhen)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-green-200 bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-800">
                    Approved
                  </span>
                </header>
                <MediaPreview imagePath={a.imagePath} title={a.title} />
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
