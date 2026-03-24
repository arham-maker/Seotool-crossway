import { requireSuperAdmin } from "../../../../../lib/middleware/auth";
import { getUserById } from "../../../../../lib/auth";
import { normalizeSiteOrigin } from "../../../../../lib/validation";

function normalizePlatform(value) {
  return String(value || "").trim().toLowerCase();
}

/** Meta Graph errors often mean expired token — surface a fix hint for admins. */
function formatMetaAccessTokenHint(message) {
  const raw = String(message || "").trim();
  if (!raw) return raw;
  if (/expired|Session has expired|invalid.*session|OAuthException|invalid oauth|Error validating access token/i.test(raw)) {
    return `${raw} — Regenerate a Page access token in Meta for Developers (Graph API Explorer: select your Page → get Page token, or use a System User token). Update META_PAGE_ACCESS_TOKEN in .env.local; optional META_APP_ACCESS_TOKEN for app-level calls. Restart npm run dev.`;
  }
  return raw;
}

function extractHandle(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";

  if (value.startsWith("@")) {
    return value.slice(1).trim();
  }

  try {
    const parsed = new URL(value);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts[0] === "@") {
      return pathParts[1] || "";
    }
    if (pathParts[0]?.startsWith("@")) {
      return pathParts[0].slice(1);
    }
    if (pathParts[0] === "channel" || pathParts[0] === "c" || pathParts[0] === "user") {
      return pathParts[1] || "";
    }
  } catch {
    // fall through
  }

  return value.replace(/^@/, "").trim();
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function resolvePlatformInput(platform, rawInput) {
  const raw = String(rawInput || "").trim();
  const parsed = parseUrl(raw);
  const isUrl = Boolean(parsed);
  const host = parsed?.hostname?.toLowerCase() || "";
  const parts = parsed?.pathname?.split("/").filter(Boolean) || [];

  if (platform === "facebook") {
    if (isUrl && host.includes("facebook.com")) {
      if (parts[0] === "profile.php") {
        const id = parsed.searchParams.get("id") || "";
        return {
          identifier: id || "profile.php",
          profileUrl: raw,
          normalizedHandle: id || raw,
          candidates: [id].filter(Boolean),
        };
      }
      if (parts[0] === "people" && parts[2]) {
        const slug = parts[1] || "";
        const id = parts[2] || "";
        return {
          identifier: id,
          profileUrl: raw,
          normalizedHandle: slug || id,
          candidates: [id, slug].filter(Boolean),
        };
      }
      if (parts[0]) {
        return {
          identifier: parts[0],
          profileUrl: raw,
          normalizedHandle: parts[0],
          candidates: [parts[0]].filter(Boolean),
        };
      }
    }
    const handle = extractHandle(raw);
    return {
      identifier: handle,
      profileUrl: `https://www.facebook.com/${encodeURIComponent(handle)}`,
      normalizedHandle: handle,
      candidates: [handle].filter(Boolean),
    };
  }

  if (platform === "instagram") {
    if (isUrl && host.includes("instagram.com") && parts[0]) {
      const handle = parts[0].replace(/^@/, "");
      return {
        identifier: handle,
        profileUrl: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
        normalizedHandle: handle,
      };
    }
    const handle = extractHandle(raw);
    return {
      identifier: handle,
      profileUrl: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
      normalizedHandle: handle,
    };
  }

  if (platform === "x") {
    if (isUrl && (host.includes("x.com") || host.includes("twitter.com"))) {
      const userIdFromQuery = (parsed.searchParams.get("user_id") || "").trim();
      const userIdFromPath =
        parts[0] === "i" && parts[1] === "user" && /^\d+$/.test(parts[2] || "") ? parts[2] : "";
      const userId = userIdFromQuery || userIdFromPath;
      const handle = (parts[0] && parts[0] !== "i" ? parts[0] : "").replace(/^@/, "");
      return {
        identifier: handle || userId,
        profileUrl: handle
          ? `https://x.com/${encodeURIComponent(handle)}`
          : userId
            ? `https://x.com/i/user/${encodeURIComponent(userId)}`
            : raw,
        normalizedHandle: handle,
        xUserId: userId || null,
      };
    }
    const rawValue = String(raw || "").trim();
    if (/^\d{5,25}$/.test(rawValue)) {
      return {
        identifier: rawValue,
        profileUrl: `https://x.com/i/user/${encodeURIComponent(rawValue)}`,
        normalizedHandle: "",
        xUserId: rawValue,
      };
    }
    const handle = extractHandle(rawValue);
    return {
      identifier: handle,
      profileUrl: `https://x.com/${encodeURIComponent(handle)}`,
      normalizedHandle: handle,
      xUserId: null,
    };
  }

  const handle = extractHandle(raw);
  return { identifier: handle, profileUrl: raw, normalizedHandle: handle };
}

function parseAbbrevNumber(value) {
  const raw = String(value || "").trim().toUpperCase().replace(/,/g, "");
  const match = raw.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!match) return Number(raw) || 0;
  const num = Number(match[1] || 0);
  const unit = match[2] || "";
  if (unit === "K") return Math.round(num * 1_000);
  if (unit === "M") return Math.round(num * 1_000_000);
  if (unit === "B") return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

async function fetchText(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
      ...extraHeaders,
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }
  return res.text();
}

async function fetchTextWithFallback(urls, extraHeaders = {}) {
  const errors = [];
  for (const url of urls) {
    try {
      const text = await fetchText(url, extraHeaders);
      return { text, url };
    } catch (error) {
      errors.push(error.message || String(error));
    }
  }
  throw new Error(errors[errors.length - 1] || "All fallback requests failed.");
}

async function fetchYoutubeSubscribers(handle, apiKey) {
  const q = encodeURIComponent(handle.startsWith("@") ? handle : `@${handle}`);
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${q}&key=${apiKey}`
  );
  const searchData = await searchRes.json();
  const channelId = searchData?.items?.[0]?.snippet?.channelId;
  if (!channelId) {
    return null;
  }

  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${encodeURIComponent(channelId)}&key=${apiKey}`
  );
  const channelData = await channelRes.json();
  const item = channelData?.items?.[0];
  if (!item) return null;

  return {
    platform: "youtube",
    accountName: item?.snippet?.title || "YouTube",
    accountHandle: `@${handle.replace(/^@/, "")}`,
    followers: Number(item?.statistics?.subscriberCount || 0),
  };
}

async function fetchFacebookFollowers(input) {
  const { profileUrl, normalizedHandle } = input;
  const candidates = Array.from(new Set((input.candidates || [input.identifier]).filter(Boolean)));
  const appToken = process.env.META_APP_ACCESS_TOKEN || "";
  const reasons = [];
  if (appToken) {
    try {
      // Resolve object id by profile URL first, then read metrics from that id.
      const lookupRes = await fetch(
        `https://graph.facebook.com/v20.0/?id=${encodeURIComponent(profileUrl)}&access_token=${encodeURIComponent(
          appToken
        )}`
      );
      const lookupData = await lookupRes.json();
      const objectId = String(lookupData?.id || "").trim();
      if (objectId) {
        const fieldCombos = ["fan_count,followers_count", "fan_count", "followers_count", "name,fan_count"];
        for (const fields of fieldCombos) {
          const metricsRes = await fetch(
            `https://graph.facebook.com/v20.0/${encodeURIComponent(
              objectId
            )}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(appToken)}`
          );
          const metricsData = await metricsRes.json();
          const lookupFollowers = Number(metricsData?.followers_count || metricsData?.fan_count || 0);
          if (lookupFollowers > 0) {
            return {
              ok: true,
              data: {
                platform: "facebook",
                accountName: metricsData?.name || normalizedHandle || "Facebook",
                accountHandle: `@${normalizedHandle}`,
                followers: lookupFollowers,
              },
            };
          }
          if (metricsData?.error?.message) {
            reasons.push(`Graph object metrics [${fields}]: ${metricsData.error.message}`);
          }
        }
      }
      if (lookupData?.error?.message) reasons.push(`Graph URL lookup: ${lookupData.error.message}`);
    } catch {
      // continue
    }

    for (const candidate of candidates) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(
            candidate
          )}?fields=fan_count,followers_count&access_token=${encodeURIComponent(appToken)}`
        );
        const data = await res.json();
        const followers = Number(data?.followers_count || data?.fan_count || 0);
        if (followers > 0) {
          return {
            ok: true,
            data: {
              platform: "facebook",
              accountName: normalizedHandle || "Facebook",
              accountHandle: `@${normalizedHandle}`,
              followers,
            },
          };
        }
        if (data?.error?.message) reasons.push(`Graph candidate '${candidate}': ${data.error.message}`);
      } catch {
        // continue to fallback
      }
    }
  }

  const variants = Array.from(
    new Set(
      [
        profileUrl,
        profileUrl.replace("https://www.facebook.com/", "https://m.facebook.com/"),
        profileUrl.replace("https://www.facebook.com/", "https://mbasic.facebook.com/"),
        `https://r.jina.ai/http://${profileUrl.replace(/^https?:\/\//, "")}`,
      ].filter(Boolean)
    )
  );
  const { text: html } = await fetchTextWithFallback(variants);
  const followerMatch = html.match(/([\d,.]+(?:[KMB])?)\s+followers/gi)?.[0] || "";
  const metaMatch = html.match(/"follower_count"\s*:\s*"?([\d,.KMB]+)"?/i)?.[1] || "";
  const count = parseAbbrevNumber(followerMatch.replace(/followers/i, "").trim());
  const fallbackCount = parseAbbrevNumber(metaMatch);
  if (count > 0 || fallbackCount > 0) {
    return {
      ok: true,
      data: {
        platform: "facebook",
        accountName: "Facebook",
        accountHandle: `@${normalizedHandle}`,
        followers: count || fallbackCount,
      },
    };
  }
  return {
    ok: false,
    reason:
      reasons[0] ||
      "Public followers not found. Page may hide follower count, require Graph permissions, or provided URL is not a public page endpoint.",
  };
}

/** Normalize token from .env (trim quotes, strip accidental "Bearer " prefix, fix paste issues). */
function normalizeXBearerToken(raw) {
  let s = String(raw || "").trim().replace(/^["']|["']$/g, "");
  s = s.replace(/^Bearer\s+/i, "");
  // Line breaks / spaces from copy-paste break the token
  s = s.replace(/\s+/g, "");
  if (!s) return "";
  try {
    if (/%[0-9A-Fa-f]{2}/.test(s)) s = decodeURIComponent(s);
  } catch {
    // keep original
  }
  return s;
}

function extractXApiError(data, status) {
  const e0 = Array.isArray(data?.errors) ? data.errors[0] : null;
  if (e0?.detail) return String(e0.detail);
  if (e0?.message) return String(e0.message);
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.title === "string" && data.title !== "Error") return data.title;
  if (typeof data?.error === "string") return data.error;
  return `HTTP ${status}`;
}

/**
 * @returns {Promise<{ ok: true, data: object } | { ok: false, reason: string }>}
 */
async function fetchXUserByPath(path, token) {
  let lastNotFound = "";
  for (const base of ["https://api.x.com", "https://api.twitter.com"]) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.data) {
        return { ok: true, data: data.data };
      }
      const msg = extractXApiError(data, res.status);
      if (res.status === 401) {
        return {
          ok: false,
          fatal: true,
          reason: `X API unauthorized (401): ${msg}. Use the OAuth 2.0 Bearer Token from X Developer Portal → your app → Keys and Tokens (not Consumer Key/Secret). Paste only the token, no "Bearer " prefix. Regenerate the token if it was exposed. Save .env.local and restart npm run dev.`,
        };
      }
      if (res.status === 403) {
        return {
          ok: false,
          fatal: true,
          reason: `X API forbidden (403): ${msg}. Ensure your X app has users.read (and appropriate access tier) for user lookup.`,
        };
      }
      if (res.status === 429) {
        return {
          ok: false,
          fatal: true,
          reason: `X API rate limited (429): ${msg}. Try again in a few minutes.`,
        };
      }
      if (res.status === 404) {
        lastNotFound = msg || "User not found.";
        continue;
      }
      lastNotFound = msg;
    } catch (err) {
      lastNotFound = err?.message || String(err);
    }
  }
  return { ok: false, reason: lastNotFound || "X API request failed." };
}

async function fetchXFollowers(input) {
  const { identifier, profileUrl, normalizedHandle, xUserId } = input;
  const token = normalizeXBearerToken(process.env.X_BEARER_TOKEN || "");

  if (!token) {
    return {
      ok: false,
      reason:
        "Missing X_BEARER_TOKEN. Add it to .env.local (not only .env), then restart npm run dev.",
    };
  }

  const idStr = String(identifier || "").trim();
  const numericId = /^\d{5,25}$/.test(idStr) ? idStr : xUserId ? String(xUserId).trim() : "";

  const paths = [];
  if (numericId) {
    paths.push(`/2/users/${encodeURIComponent(numericId)}?user.fields=public_metrics,name,username`);
  }
  if (idStr && !/^\d{5,25}$/.test(idStr)) {
    paths.push(`/2/users/by/username/${encodeURIComponent(idStr.replace(/^@/, ""))}?user.fields=public_metrics,name,username`);
  }

  if (!paths.length) {
    return {
      ok: false,
      reason: "Enter an X @handle, profile URL, or numeric user ID.",
    };
  }

  let apiFailureReason = "";

  for (const path of paths) {
    const result = await fetchXUserByPath(path, token);
    if (result.ok && result.data) {
      const user = result.data;
      const count = Number(user?.public_metrics?.followers_count ?? 0);
      const handle =
        user?.username || normalizedHandle || idStr.replace(/^@/, "") || "x";
      return {
        ok: true,
        data: {
          platform: "x",
          accountName: user?.name || "X",
          accountHandle: `@${handle}`,
          followers: count,
        },
      };
    }
    if (result.fatal) {
      return { ok: false, reason: result.reason };
    }
    apiFailureReason = result.reason || apiFailureReason;
  }

  let htmlErr = "";
  try {
    const htmlCandidates = Array.from(
      new Set(
        [
          profileUrl,
          profileUrl?.replace("https://x.com/", "https://twitter.com/"),
          profileUrl ? `https://r.jina.ai/http://${profileUrl.replace(/^https?:\/\//, "")}` : "",
        ].filter(Boolean)
      )
    );
    if (htmlCandidates.length) {
      const { text: html } = await fetchTextWithFallback(htmlCandidates);
      const jsonMetric = html.match(/"followers_count"\s*:\s*(\d+)/);
      const textMetric = html.match(/([\d,.]+(?:[KMB])?)\s+Followers/i);
      const parsed = jsonMetric
        ? Number(jsonMetric[1] || 0)
        : parseAbbrevNumber(textMetric?.[1] || 0);
      if (parsed > 0) {
        const h = normalizedHandle || idStr.replace(/^@/, "") || "x";
        return {
          ok: true,
          data: {
            platform: "x",
            accountName: "X",
            accountHandle: `@${h}`,
            followers: parsed,
          },
        };
      }
    }
  } catch (err) {
    htmlErr = err?.message || String(err);
  }

  const parts = [apiFailureReason && `X API: ${apiFailureReason}`];
  if (htmlErr) parts.push(`Page fallback: ${htmlErr}`);
  return {
    ok: false,
    reason:
      parts.filter(Boolean).join(" ") ||
      "Unable to resolve X followers. Verify the handle exists and your X Developer app has access to user lookup.",
  };
}

export async function POST(req) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const { userId, siteUrl, accounts, facebookPageId, instagramUserId } = body || {};

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await getUserById(userId);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalizedSite = normalizeSiteOrigin(siteUrl || user.siteLink || "");
    if (!normalizedSite) {
      return new Response(JSON.stringify({ error: "A valid integrated site URL is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rows = Array.isArray(accounts) ? accounts : [];
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "accounts array is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.PAGESPEED_API_KEY || "";
    const resolved = [];
    const skipped = [];

    for (const row of rows) {
      const platform = normalizePlatform(row.platform);
      const input = resolvePlatformInput(platform, row.accountHandle);
      if (!input.identifier) continue;

      if (platform === "youtube") {
        try {
          if (!youtubeApiKey) {
            skipped.push({
              platform,
              accountHandle: row.accountHandle,
              reason: "Missing YOUTUBE_API_KEY (or PAGESPEED_API_KEY fallback).",
            });
            continue;
          }
          const ytData = await fetchYoutubeSubscribers(input.identifier, youtubeApiKey);
          if (ytData) {
            resolved.push(ytData);
          } else {
            skipped.push({
              platform,
              accountHandle: row.accountHandle,
              reason: "Channel not found from handle.",
            });
          }
        } catch (error) {
          skipped.push({
            platform,
            accountHandle: row.accountHandle,
            reason: error.message || "Failed to fetch YouTube subscribers.",
          });
        }
      } else if (platform === "facebook") {
        try {
          if (facebookPageId) {
            const token = process.env.META_PAGE_ACCESS_TOKEN || process.env.META_APP_ACCESS_TOKEN || "";
            if (!token) {
              skipped.push({
                platform,
                accountHandle: row.accountHandle,
                reason: "Missing META_PAGE_ACCESS_TOKEN (or META_APP_ACCESS_TOKEN).",
              });
              continue;
            }
            const pageRes = await fetch(
              `https://graph.facebook.com/v20.0/${encodeURIComponent(
                String(facebookPageId).trim()
              )}?fields=name,followers_count,fan_count&access_token=${encodeURIComponent(token)}`
            );
            const pageData = await pageRes.json();
            const count = Number(pageData?.followers_count || pageData?.fan_count || 0);
            if (count > 0) {
              resolved.push({
                platform: "facebook",
                accountName: pageData?.name || "facebook",
                accountHandle: row.accountHandle || `@${String(facebookPageId).trim()}`,
                followers: count,
              });
              continue;
            }
            if (pageData?.error?.message) {
              skipped.push({
                platform,
                accountHandle: row.accountHandle,
                reason: `Facebook Graph by Page ID failed: ${formatMetaAccessTokenHint(pageData.error.message)}`,
              });
              continue;
            }
          }

          const result = await fetchFacebookFollowers(input);
          if (result.ok && result.data) {
            resolved.push(result.data);
          } else {
            skipped.push({
              platform,
              accountHandle: row.accountHandle,
              reason: formatMetaAccessTokenHint(result.reason) || result.reason || "Unable to resolve Facebook followers from handle/link.",
            });
          }
        } catch (error) {
          skipped.push({
            platform,
            accountHandle: row.accountHandle,
            reason: error.message || "Failed to fetch Facebook followers.",
          });
        }
      } else if (platform === "instagram") {
        try {
          const igUserIdTrimmed = String(instagramUserId || "").trim();
          if (igUserIdTrimmed) {
            const token = process.env.META_PAGE_ACCESS_TOKEN || process.env.META_APP_ACCESS_TOKEN || "";
            if (!token) {
              skipped.push({
                platform,
                accountHandle: row.accountHandle,
                reason: "Missing META_PAGE_ACCESS_TOKEN (or META_APP_ACCESS_TOKEN).",
              });
              continue;
            }
            const igRes = await fetch(
              `https://graph.facebook.com/v20.0/${encodeURIComponent(
                igUserIdTrimmed
              )}?fields=username,followers_count,media_count&access_token=${encodeURIComponent(token)}`
            );
            const igData = await igRes.json();
            if (igData?.error?.message) {
              skipped.push({
                platform,
                accountHandle: row.accountHandle,
                reason: `Instagram Graph by User ID failed: ${formatMetaAccessTokenHint(igData.error.message)}`,
              });
              continue;
            }
            const count = Number(igData?.followers_count ?? 0);
            if (igRes.ok && (igData?.username != null || igData?.id != null)) {
              resolved.push({
                platform: "instagram",
                accountName: igData?.username || "instagram",
                accountHandle: `@${igData?.username || extractHandle(row.accountHandle)}`,
                followers: count,
              });
              continue;
            }
            skipped.push({
              platform,
              accountHandle: row.accountHandle,
              reason:
                "Instagram Graph returned no user for this ID. Use the Instagram Business Account ID from Meta (Graph API Explorer: GET {your-page-id}?fields=instagram_business_account).",
            });
            continue;
          }
          skipped.push({
            platform,
            accountHandle: row.accountHandle,
            reason:
              "Instagram: enter the numeric Instagram User ID in User Management → Edit user. Link the IG Business/Creator account to your Facebook Page, ensure META_PAGE_ACCESS_TOKEN has instagram_basic (and Page permissions). Without the Graph ID, public endpoints return 400/429.",
          });
          continue;
        } catch (error) {
          skipped.push({
            platform,
            accountHandle: row.accountHandle,
            reason: error.message || "Failed to fetch Instagram followers.",
          });
        }
      } else if (platform === "x") {
        try {
          const result = await fetchXFollowers(input);
          if (result.ok) {
            resolved.push(result.data);
          } else {
            skipped.push({
              platform,
              accountHandle: row.accountHandle,
              reason: result.reason || "Unable to resolve X followers from handle/link.",
            });
          }
        } catch (error) {
          skipped.push({
            platform,
            accountHandle: row.accountHandle,
            reason: error.message || "Failed to fetch X followers.",
          });
        }
      } else {
        skipped.push({
          platform,
          accountHandle: row.accountHandle,
          reason: "Platform is not supported for auto-fetch yet.",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Handle fetch completed.",
        siteUrl: normalizedSite,
        userId,
        resolved,
        skipped,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    if (error.message === "Unauthorized" || error.message.includes("Super admin")) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Super admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch handle data." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

