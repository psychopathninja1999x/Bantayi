/** Local calendar date as YYYY-MM-DD (no time / UTC drift for comparisons). */
export function localTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addCalendarDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new RangeError(`Invalid ISO date: ${isoDate}`);
  }
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Earliest non-null ISO date string (valid for YYYY-MM-DD lexicographic order). */
export function earliestDate(dates: (string | null | undefined)[]): string | null {
  const filtered = dates.filter((x): x is string => x != null && x.length > 0);
  if (filtered.length === 0) return null;
  return filtered.reduce((a, b) => (a <= b ? a : b));
}

export function nowIsoTimestamp(): string {
  return new Date().toISOString();
}
