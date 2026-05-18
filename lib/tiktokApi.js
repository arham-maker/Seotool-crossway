/**
 * TikTok Open API helpers (Research API for public username → follower_count).
 * @see https://developers.tiktok.com/
 */

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const RESEARCH_USER_INFO_URL =
  "https://open.tiktokapis.com/v2/research/user/info/?fields=display_name,username,follower_count,is_verified";

let cachedClientToken = null;
let cachedClientTokenExpiresAt = 0;

function formatTikTokApiError(payload) {
  const err = payload?.error;
  if (typeof err === "string") {
    return err;
  }
  if (err && typeof err === "object") {
    const code = err.code || err.error_code;
    const msg = err.message || err.error_description || err.error_msg;
    if (code && msg) return `${code}: ${msg}`;
    if (msg) return String(msg);
    if (code) return String(code);
  }
  if (payload?.error_description) return String(payload.error_description);
  if (payload?.message) return String(payload.message);
  return null;
}

/**
 * Client access token (valid ~2h). Used for Research API when approved.
 */
export async function getTikTokClientAccessToken(clientKey, clientSecret) {
  const key = String(clientKey || "").trim();
  const secret = String(clientSecret || "").trim();
  if (!key || !secret) {
    return { ok: false, reason: "TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are required." };
  }

  const now = Date.now();
  if (cachedClientToken && cachedClientTokenExpiresAt > now + 60_000) {
    return { ok: true, accessToken: cachedClientToken };
  }

  const body = new URLSearchParams({
    client_key: key,
    client_secret: secret,
    grant_type: "client_credentials",
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok || !data?.access_token) {
    const detail = formatTikTokApiError(data) || `HTTP ${res.status}`;
    return {
      ok: false,
      reason: `TikTok OAuth failed: ${detail}. Check client key/secret from developers.tiktok.com → your app → Credentials.`,
    };
  }

  cachedClientToken = data.access_token;
  cachedClientTokenExpiresAt = now + Number(data.expires_in || 7200) * 1000;
  return { ok: true, accessToken: cachedClientToken };
}

/**
 * Research API: lookup user by username (requires Research API product + research.data.basic on the app).
 */
export async function fetchTikTokUserByUsername(username, accessToken) {
  const user = String(username || "")
    .trim()
    .replace(/^@/, "");
  if (!user) {
    return { ok: false, reason: "TikTok username is empty." };
  }

  const res = await fetch(RESEARCH_USER_INFO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username: user }),
  });
  const payload = await res.json();
  const apiErr = formatTikTokApiError(payload);
  if (apiErr && String(apiErr).toLowerCase() !== "ok") {
    const hint =
      /scope|research|permission|not authorized|access denied/i.test(apiErr)
        ? " Apply for the Research API on developers.tiktok.com (Products → Research API) and ensure research.data.basic is enabled for your app."
        : "";
    return { ok: false, reason: `TikTok Research API: ${apiErr}.${hint}` };
  }

  const info = payload?.data;
  if (!info || info.follower_count == null) {
    return {
      ok: false,
      reason: `TikTok Research API returned no follower_count for @${user}.`,
    };
  }

  return {
    ok: true,
    data: {
      platform: "tiktok",
      accountName: info.display_name || user,
      accountHandle: `@${info.username || user}`,
      followers: Number(info.follower_count || 0),
    },
  };
}

/** Clear cached token (tests or after credential rotation). */
export function clearTikTokClientTokenCache() {
  cachedClientToken = null;
  cachedClientTokenExpiresAt = 0;
}
