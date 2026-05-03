const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type DateParseResult =
  | { ok: true; value: string | null }
  | { ok: false; message: string };

export type ReminderParseResult =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

/**
 * Empty input → null. Otherwise must be a valid calendar date YYYY-MM-DD.
 */
export function parseOptionalISODate(raw: string): DateParseResult {
  const t = raw.trim();
  if (!t) {
    return { ok: true, value: null };
  }
  if (!ISO_DATE.test(t)) {
    return { ok: false, message: 'Use format YYYY-MM-DD (e.g. 2026-12-31).' };
  }
  const [y, m, d] = t.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return { ok: false, message: 'Invalid date.' };
  }
  return { ok: true, value: t };
}

/**
 * Optional non-negative integer for reminder days. Empty → null.
 */
export function parseOptionalReminderDays(raw: string): ReminderParseResult {
  const t = raw.trim();
  if (!t) {
    return { ok: true, value: null };
  }
  const n = Number.parseInt(t, 10);
  if (Number.isNaN(n) || String(n) !== t) {
    return { ok: false, message: 'Reminder days must be a whole number (e.g. 7).' };
  }
  if (n < 0) {
    return { ok: false, message: 'Reminder days cannot be below 0.' };
  }
  return { ok: true, value: n };
}
