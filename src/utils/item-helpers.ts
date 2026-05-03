import type { Item } from '@/src/types';

import { getCategoryInfo } from '@/src/constants/categories';
import { getDocumentSubcategoryInfo } from '@/src/constants/document-subcategories';
import { addCalendarDaysIso, earliestDate, localTodayISO } from '@/src/database/date-helpers';
import type { StatusBadgeTone } from '@/src/components/StatusBadge';

/** Days ahead counted as “expiring soon” on Home. */
export const EXPIRING_SOON_DAYS = 14;

/** Days ahead for the upcoming-reminders list on Home. */
export const UPCOMING_LIST_DAYS = 90;

export function itemDeadline(item: Item): string | null {
  if (item.no_expiry) return null;
  return earliestDate([item.expiry_date, item.warranty_until]);
}

export function countActiveItems(items: Item[]): number {
  return items.filter((i) => i.status === 'active').length;
}

export function countExpiringSoonItems(items: Item[]): number {
  const today = localTodayISO();
  const soonEnd = addCalendarDaysIso(today, EXPIRING_SOON_DAYS);
  return items.filter((i) => isExpiringSoon(i, today, soonEnd)).length;
}

export function countExpiredItems(items: Item[]): number {
  const today = localTodayISO();
  return items.filter((i) => isExpiredForDashboard(i, today)).length;
}

function isExpiringSoon(item: Item, today: string, soonEnd: string): boolean {
  if (item.status === 'archived' || item.status === 'expired') return false;
  const d = itemDeadline(item);
  if (!d) return false;
  if (d < today) return false;
  return d <= soonEnd;
}

function isExpiredForDashboard(item: Item, today: string): boolean {
  if (item.status === 'archived') return false;
  if (item.status === 'expired') return true;
  if (item.status === 'renewed') return false;
  const d = itemDeadline(item);
  if (!d) return false;
  return d < today;
}

/** Upcoming deadlines for Home (not archived, deadline in range, not overdue). */
export function selectUpcomingReminderItems(items: Item[]): Item[] {
  const today = localTodayISO();
  const end = addCalendarDaysIso(today, UPCOMING_LIST_DAYS);
  return items
    .filter((i) => {
      if (i.status === 'archived') return false;
      const d = itemDeadline(i);
      if (!d) return false;
      return d >= today && d <= end;
    })
    .sort((a, b) => {
      const da = itemDeadline(a) ?? '';
      const db = itemDeadline(b) ?? '';
      return da.localeCompare(db);
    });
}

/** Badge tone for list rows using status + deadlines (labels use `StatusBadge` defaults). */
export function statusToneForItem(item: Item): StatusBadgeTone {
  const today = localTodayISO();
  const d = itemDeadline(item);
  if (item.status === 'archived') {
    return 'archived';
  }
  if (item.status === 'renewed') {
    return 'renewed';
  }
  if (item.status === 'expired') {
    return 'expired';
  }
  if (d && d < today) {
    return 'expired';
  }
  if (item.status === 'active' && d) {
    const soonEnd = addCalendarDaysIso(today, EXPIRING_SOON_DAYS);
    if (d >= today && d <= soonEnd) {
      return 'expiring_soon';
    }
  }
  return 'active';
}

/** Category label plus document subtype when set (for list subtitles). */
export function formatItemCategoryLine(item: Item): string {
  const cat = getCategoryInfo(item.category);
  if (item.category === 'document' && item.subcategory) {
    const sub = getDocumentSubcategoryInfo(item.subcategory);
    if (sub) return `${cat.label} · ${sub.label}`;
  }
  return cat.label;
}

export function formatItemDateLines(item: Item): string {
  if (item.no_expiry) {
    return 'No expiry';
  }
  const parts: string[] = [];
  if (item.expiry_date) {
    const label =
      item.category === 'bill_due'
        ? 'Due'
        : item.category === 'card_expiry'
          ? 'Card expiry'
          : 'Expiry';
    parts.push(`${label}: ${item.expiry_date}`);
  }
  if (item.warranty_until) {
    parts.push(`Warranty: ${item.warranty_until}`);
  }
  if (parts.length === 0) {
    return 'No dates';
  }
  return parts.join(' · ');
}
