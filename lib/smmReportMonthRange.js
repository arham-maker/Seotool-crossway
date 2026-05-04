/**
 * Calendar month ranges for SMM reports (not rolling N-day windows).
 */

function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatYearMonth(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}`;
}

export function parseYearMonth(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (mo < 0 || mo > 11 || !Number.isFinite(y)) return null;
  return { y, mo };
}

function toStartOfDayLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toEndOfDayLocal(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * @param {string} endMonthStr - YYYY-MM (report ends in this calendar month)
 * @param {number} monthSpan - 1, 2, or 3 consecutive months ending in endMonthStr
 * @returns {{ start: Date, end: Date, endMonthClamped: string, monthSpan: number }}
 */
export function getCalendarMonthRange(endMonthStr, monthSpan) {
  const span = [1, 2, 3].includes(Number(monthSpan)) ? Number(monthSpan) : 1;
  const now = new Date();
  const curKey = formatYearMonth(now);
  let parsed = parseYearMonth(endMonthStr);
  if (!parsed) parsed = parseYearMonth(curKey);
  let { y: endY, mo: endMo } = parsed;

  const curYM = now.getFullYear() * 12 + now.getMonth();
  let selYM = endY * 12 + endMo;
  if (selYM > curYM) {
    endY = now.getFullYear();
    endMo = now.getMonth();
    selYM = curYM;
  }

  let startY = endY;
  let startMo = endMo;
  for (let i = 0; i < span - 1; i += 1) {
    startMo -= 1;
    if (startMo < 0) {
      startMo = 11;
      startY -= 1;
    }
  }

  const start = toStartOfDayLocal(new Date(startY, startMo, 1));
  const lastDayOfEndMonth = new Date(endY, endMo + 1, 0);
  const endOfSelectedMonth = toEndOfDayLocal(lastDayOfEndMonth);
  const endOfToday = toEndOfDayLocal(now);
  const end = endOfSelectedMonth.getTime() > endOfToday.getTime() ? endOfToday : endOfSelectedMonth;

  return {
    start,
    end,
    endMonthClamped: `${endY}-${pad2(endMo + 1)}`,
    monthSpan: span,
  };
}

export function describeReportPeriod(start, end, monthSpan) {
  const opts = { month: "short", year: "numeric" };
  const a = start.toLocaleDateString(undefined, opts);
  const b = end.toLocaleDateString(undefined, opts);
  return `${monthSpan} month${monthSpan > 1 ? "s" : ""}: ${a} – ${b}`;
}

/** First and last calendar day of month as YYYY-MM-DD (end clamped to today if future). */
export function getCalendarMonthYmdBounds(ymStr, now = new Date()) {
  const p = parseYearMonth(ymStr);
  if (!p) return null;
  const { y, mo } = p;
  const curYM = now.getFullYear() * 12 + now.getMonth();
  const selYM = y * 12 + mo;
  let useY = y;
  let useMo = mo;
  if (selYM > curYM) {
    useY = now.getFullYear();
    useMo = now.getMonth();
  }
  const startD = new Date(useY, useMo, 1);
  const lastDay = new Date(useY, useMo + 1, 0);
  const endCal = new Date(useY, useMo + 1, 0, 23, 59, 59, 999);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endD = endCal.getTime() > todayEnd.getTime() ? todayEnd : lastDay;
  const fmt = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return { startDate: fmt(startD), endDate: fmt(endD), yearMonth: `${useY}-${pad2(useMo + 1)}` };
}

export function humanMonthYear(ymStr) {
  const p = parseYearMonth(ymStr);
  if (!p) return String(ymStr || "");
  const d = new Date(p.y, p.mo, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
