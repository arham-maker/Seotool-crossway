/**
 * YYYY-MM-DD date helpers and Search Console–style range presets
 * (used by the Website Statistics date modal and the performance API)
 */

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatYMD(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYMD(s) {
  if (!YMD_RE.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

export function isValidYMD(s) {
  return formatYMD(parseYMD(s) || new Date("invalid")) === s;
}

function calendarAddMonths(d, delta) {
  const o = new Date(d.getTime());
  const day = o.getDate();
  o.setMonth(o.getMonth() + delta);
  if (o.getDate() !== day) o.setDate(0);
  return o;
}

export function addCalendarDays(ymd, n) {
  const d = parseYMD(ymd);
  if (!d) return null;
  d.setDate(d.getDate() + n);
  return formatYMD(d);
}

/** Inclusive number of calendar days in [a, b] (both YYYY-MM-DD) */
export function inclusiveDayCountYMD(a, b) {
  const d1 = parseYMD(a);
  const d2 = parseYMD(b);
  if (!d1 || !d2) return 0;
  return Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
}

/** The period of equal length immediately before `startYMD` (inclusive) */
export function previousBlockEqualLength(startYMD, endYMD) {
  const n = inclusiveDayCountYMD(startYMD, endYMD);
  if (n < 1) return null;
  const endC = addCalendarDays(startYMD, -1);
  const startC = addCalendarDays(endC, -(n - 1));
  return { startDate: startC, endDate: endC };
}

export function yoyBlock(startYMD, endYMD) {
  const s = parseYMD(startYMD);
  const e = parseYMD(endYMD);
  if (!s || !e) return null;
  s.setFullYear(s.getFullYear() - 1);
  e.setFullYear(e.getFullYear() - 1);
  return { startDate: formatYMD(s), endDate: formatYMD(e) };
}

/**
 * Search Console daily data is typically complete through ~2–3 calendar days before “today”.
 * We end ranges on this date so queries match what the API returns (avoids empty tail days).
 */
const GSC_DATA_LAG_DAYS = 3;
/** Inclusive day cap (~16 months) to avoid API errors at the retention edge. */
const GSC_MAX_INCLUSIVE_DAYS = 486;

/** Latest calendar day that typically has complete Search Console daily data (YYYY-MM-DD). */
export function getSearchConsoleLatestCompleteDayYmd(endNow = new Date()) {
  const endDate = new Date(
    endNow.getFullYear(),
    endNow.getMonth(),
    endNow.getDate(),
    12,
    0,
    0
  );
  endDate.setDate(endDate.getDate() - GSC_DATA_LAG_DAYS);
  return formatYMD(endDate) || "";
}

/**
 * Clamp any YYYY-MM-DD range to dates the Search Analytics API accepts:
 * end not after (today − lag), start ≤ end, and span not longer than {@link GSC_MAX_INCLUSIVE_DAYS}.
 */
export function clampSearchConsoleQueryRange(startYMD, endYMD) {
  let s = parseYMD(startYMD);
  let e = parseYMD(endYMD);
  if (!s || !e) {
    return getDateRangeForPresetId("28d", new Date());
  }
  const cap = new Date();
  cap.setHours(12, 0, 0, 0);
  cap.setDate(cap.getDate() - GSC_DATA_LAG_DAYS);
  if (e > cap) e = new Date(cap.getTime());
  if (s > e) {
    s = new Date(e.getTime());
    s.setDate(s.getDate() - 27);
  }
  const span = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  if (span > GSC_MAX_INCLUSIVE_DAYS) {
    s = new Date(e.getTime());
    s.setDate(s.getDate() - (GSC_MAX_INCLUSIVE_DAYS - 1));
  }
  const startDate = formatYMD(s);
  const endDate = formatYMD(e);
  if (!startDate || !endDate) {
    return getDateRangeForPresetId("28d", new Date());
  }
  return { startDate, endDate };
}

/**
 * @param {string} range
 * @param {Date} [endNow]
 * @returns {{ startDate: string, endDate: string }}
 */
export function getDateRangeForPresetId(range, endNow = new Date()) {
  const endYmd = getSearchConsoleLatestCompleteDayYmd(endNow);
  const endDate = parseYMD(endYmd);
  if (!endDate) {
    return getDateRangeForPresetId("28d", new Date());
  }
  const startDate = new Date(endDate);

  switch (range) {
    case "7d":
      startDate.setDate(startDate.getDate() - 6);
      break;
    case "28d":
      startDate.setDate(startDate.getDate() - 27);
      break;
    case "3m":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "6m":
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case "12m":
      startDate.setMonth(startDate.getMonth() - 12);
      break;
    case "16m":
      startDate.setMonth(startDate.getMonth() - 16);
      break;
    default:
      startDate.setDate(startDate.getDate() - 28);
  }

  return {
    startDate: formatYMD(startDate),
    endDate: endYmd,
  };
}

function lastNDays(n, endNow = new Date()) {
  const endYmd = getSearchConsoleLatestCompleteDayYmd(endNow);
  const e = parseYMD(endYmd);
  if (!e) return { startDate: endYmd, endDate: endYmd };
  const s = new Date(e);
  s.setDate(s.getDate() - (n - 1));
  return { startDate: formatYMD(s), endDate: endYmd };
}

/**
 * @param {string} presetId
 * @param {Date} [ref]
 * @returns {null | { primary: { startDate, endDate }, compare: { startDate, endDate } }}
 */
export function getComparePresetRanges(presetId, ref = new Date()) {
  const t = (s, e) => ({
    primary: { startDate: s, endDate: e },
    compare: null,
  });

  switch (presetId) {
    case "c7d_prev": {
      const p = lastNDays(7, ref);
      const c = previousBlockEqualLength(p.startDate, p.endDate);
      return c ? { primary: p, compare: c } : null;
    }
    case "c7d_yoy": {
      const p = lastNDays(7, ref);
      const c = yoyBlock(p.startDate, p.endDate);
      return c ? { primary: p, compare: c } : null;
    }
    case "c28d_prev": {
      const p = lastNDays(28, ref);
      const c = previousBlockEqualLength(p.startDate, p.endDate);
      return c ? { primary: p, compare: c } : null;
    }
    case "c28d_yoy": {
      const p = lastNDays(28, ref);
      const c = yoyBlock(p.startDate, p.endDate);
      return c ? { primary: p, compare: c } : null;
    }
    case "c3m_prev": {
      const endD = new Date(
        ref.getFullYear(),
        ref.getMonth(),
        ref.getDate(),
        12,
        0,
        0
      );
      const pStartD = calendarAddMonths(endD, -3);
      const p0 = { startDate: formatYMD(pStartD), endDate: formatYMD(endD) };
      const cEnd = addCalendarDays(p0.startDate, -1);
      if (!cEnd) return null;
      const cStartD = calendarAddMonths(pStartD, -3);
      return { primary: p0, compare: { startDate: formatYMD(cStartD), endDate: cEnd } };
    }
    case "c3m_yoy": {
      const endD = new Date(
        ref.getFullYear(),
        ref.getMonth(),
        ref.getDate(),
        12,
        0,
        0
      );
      const pStart = calendarAddMonths(endD, -3);
      const p0 = { startDate: formatYMD(pStart), endDate: formatYMD(endD) };
      const c = yoyBlock(p0.startDate, p0.endDate);
      return c ? { primary: p0, compare: c } : null;
    }
    case "c6m_prev": {
      const endD = new Date(
        ref.getFullYear(),
        ref.getMonth(),
        ref.getDate(),
        12,
        0,
        0
      );
      const pStartD = calendarAddMonths(endD, -6);
      const p0 = { startDate: formatYMD(pStartD), endDate: formatYMD(endD) };
      const cEnd = addCalendarDays(p0.startDate, -1);
      if (!cEnd) return null;
      const cStartD = calendarAddMonths(pStartD, -6);
      return { primary: p0, compare: { startDate: formatYMD(cStartD), endDate: cEnd } };
    }
    case "c6m_yoy": {
      const endD = new Date(
        ref.getFullYear(),
        ref.getMonth(),
        ref.getDate(),
        12,
        0,
        0
      );
      const pStart = calendarAddMonths(endD, -6);
      const p0 = { startDate: formatYMD(pStart), endDate: formatYMD(endD) };
      const c = yoyBlock(p0.startDate, p0.endDate);
      return c ? { primary: p0, compare: c } : null;
    }
    case "c16m_prev": {
      const p = getDateRangeForPresetId("16m", ref);
      const c = previousBlockEqualLength(p.startDate, p.endDate);
      return c ? { primary: p, compare: c } : null;
    }
    case "c16m_yoy": {
      const p = getDateRangeForPresetId("16m", ref);
      const c = yoyBlock(p.startDate, p.endDate);
      return c ? { primary: p, compare: c } : null;
    }
    default:
      return null;
  }
}

/**
 * Fill every calendar day between startDate and endDate,
 * using sparse API rows (missing days => zeros).
 */
export function densifyTimeSeries(startYMD, endYMD, sparse) {
  const s = parseYMD(startYMD);
  const e = parseYMD(endYMD);
  if (!s || !e || s > e) return [];
  const map = new Map();
  (sparse || []).forEach((row) => {
    if (row?.date) {
      map.set(row.date, {
        date: row.date,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }
  });
  const out = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const k = formatYMD(d);
    if (k && map.has(k)) {
      out.push({ ...map.get(k) });
    } else {
      out.push({ date: k, clicks: 0, impressions: 0, ctr: 0, position: 0 });
    }
  }
  return out;
}

/**
 * Same calendar span as `primary` but with compare's daily values, index-aligned
 * for Recharts (primaryDate + compare* fields).
 */
export function mergeCompareTimeSeries(
  primaryDense,
  compareDense
) {
  const n = Math.min(primaryDense.length, compareDense.length);
  return primaryDense.slice(0, n).map((p, i) => ({
    date: p.date,
    dateLabel: p.date.slice(5),
    clicks: p.clicks,
    impressions: p.impressions,
    ctr: p.ctr,
    position: p.position,
    compareClicks: compareDense[i]?.clicks || 0,
    compareImpressions: compareDense[i]?.impressions || 0,
    compareCtr: compareDense[i]?.ctr || 0,
    comparePosition: compareDense[i]?.position || 0,
  }));
}
