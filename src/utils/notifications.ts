import { addCalendarDaysIso, localTodayISO } from '@/src/database/date-helpers';
import type { Item } from '@/src/types';

export type NotificationKind = 'expiry' | 'warranty';
export type NotificationUrgency = 'overdue' | 'today' | 'soon' | 'upcoming' | 'scheduled' | 'unscheduled';

export interface ItemNotification {
  id: string;
  item: Item;
  kind: NotificationKind;
  title: string;
  body: string;
  deadline: string;
  reminderDate: string | null;
  daysUntilDeadline: number;
  scheduled: boolean;
  urgency: NotificationUrgency;
}

function daysBetweenISO(fromIso: string, toIso: string): number {
  const a = fromIso.split('-').map(Number);
  const b = toIso.split('-').map(Number);
  const dA = new Date(a[0], a[1] - 1, a[2]).getTime();
  const dB = new Date(b[0], b[1] - 1, b[2]).getTime();
  return Math.round((dB - dA) / (24 * 60 * 60 * 1000));
}

function reminderDateFor(deadline: string, daysBefore: number | null): string | null {
  if (daysBefore == null || daysBefore < 0) return null;
  try {
    return addCalendarDaysIso(deadline, -daysBefore);
  } catch {
    return null;
  }
}

function urgencyFor(daysUntilDeadline: number, scheduled: boolean): NotificationUrgency {
  if (daysUntilDeadline < 0) return 'overdue';
  if (daysUntilDeadline === 0) return 'today';
  if (daysUntilDeadline <= 14) return 'soon';
  return scheduled ? 'scheduled' : 'upcoming';
}

export function buildItemNotifications(items: Item[]): ItemNotification[] {
  const today = localTodayISO();
  const rows: ItemNotification[] = [];

  for (const item of items) {
    if (item.status === 'archived' || item.no_expiry) continue;

    if (item.expiry_date) {
      const days = daysBetweenISO(today, item.expiry_date);
      const scheduled = Boolean(item.notification_id_expiry);
      rows.push({
        id: `${item.id}:expiry`,
        item,
        kind: 'expiry',
        title: `${item.title} expires`,
        body: days < 0 ? 'Expiry date has passed.' : 'Expiry reminder.',
        deadline: item.expiry_date,
        reminderDate: reminderDateFor(item.expiry_date, item.reminder_days_before),
        daysUntilDeadline: days,
        scheduled,
        urgency: urgencyFor(days, scheduled),
      });
    }

    if (item.warranty_until) {
      const days = daysBetweenISO(today, item.warranty_until);
      const scheduled = Boolean(item.notification_id_warranty);
      rows.push({
        id: `${item.id}:warranty`,
        item,
        kind: 'warranty',
        title: `${item.title} warranty ends`,
        body: days < 0 ? 'Warranty date has passed.' : 'Warranty reminder.',
        deadline: item.warranty_until,
        reminderDate: reminderDateFor(item.warranty_until, item.reminder_days_before),
        daysUntilDeadline: days,
        scheduled,
        urgency: urgencyFor(days, scheduled),
      });
    }
  }

  return rows.sort((a, b) => {
    const group = (n: ItemNotification) =>
      n.daysUntilDeadline < 0 ? 0 : n.daysUntilDeadline === 0 ? 1 : n.daysUntilDeadline <= 14 ? 2 : 3;
    return group(a) - group(b) || a.deadline.localeCompare(b.deadline) || a.title.localeCompare(b.title);
  });
}

export function labelForNotification(notification: ItemNotification): string {
  const days = notification.daysUntilDeadline;
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}
