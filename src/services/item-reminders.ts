import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  clearAllItemNotificationIds,
  getAllItems,
  getItemById,
  setItemNotificationIds,
} from '@/src/database/items';

const PREF_KEY = 'bantayi_local_reminders_enabled';
const INITIAL_PERMISSION_ASKED_KEY = 'bantayi_initial_reminder_permission_asked';
const ANDROID_CHANNEL = 'bantayi-reminders';

function escapeTitle(title: string): string {
  const t = title.trim();
  return t.length > 0 ? t.slice(0, 120) : 'Item';
}

export async function getRemindersEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(PREF_KEY);
  if (v === null) return true;
  return v === '1';
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(PREF_KEY, enabled ? '1' : '0');
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'BanTayi reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** Request OS permission (call when user opts in or saves an item with a reminder). */
export async function requestNotificationPermissionIfNeeded(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * First-install onboarding request. This runs once after the local profile is saved,
 * then Settings remains the place to re-enable reminders if the user declines.
 */
export async function requestInitialReminderPermissionIfNeeded(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const asked = await SecureStore.getItemAsync(INITIAL_PERMISSION_ASKED_KEY);
  if (asked === '1') {
    return Notifications.getPermissionsAsync().then(({ status }) => status === 'granted');
  }

  const granted = await requestNotificationPermissionIfNeeded();
  await setRemindersEnabled(granted);
  await SecureStore.setItemAsync(INITIAL_PERMISSION_ASKED_KEY, '1');
  return granted;
}

export async function cancelNotificationsForItem(item: {
  notification_id_expiry: string | null;
  notification_id_warranty: string | null;
}): Promise<void> {
  if (Platform.OS === 'web') return;
  const ids = [item.notification_id_expiry, item.notification_id_warranty].filter(
    (x): x is string => x != null && x.length > 0,
  );
  for (const nid of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(nid);
    } catch {
      /* stale id */
    }
  }
}

function fireDateAtReminder(isoDate: string, daysBefore: number): Date | null {
  const parts = isoDate.trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - daysBefore);
  dt.setHours(9, 0, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/**
 * Cancels prior scheduled notifications for this item, then schedules up to two local notifications
 * (expiry + warranty) when enabled, dates exist, and fire time is in the future.
 */
export async function syncRemindersAfterItemChange(itemId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const item = await getItemById(itemId);
  if (!item) return;

  await cancelNotificationsForItem(item);

  const enabled = await getRemindersEnabled();
  const shouldConsider =
    enabled &&
    item.status !== 'archived' &&
    item.reminder_days_before != null &&
    item.reminder_days_before >= 0;

  if (!shouldConsider) {
    await setItemNotificationIds(itemId, {
      notification_id_expiry: null,
      notification_id_warranty: null,
    });
    return;
  }

  const days = item.reminder_days_before!;
  const now = Date.now();
  const wantsExpiry = Boolean(item.expiry_date);
  const wantsWarranty = Boolean(item.warranty_until);
  const expiryWhen = wantsExpiry && item.expiry_date ? fireDateAtReminder(item.expiry_date, days) : null;
  const warrantyWhen =
    wantsWarranty && item.warranty_until ? fireDateAtReminder(item.warranty_until, days) : null;
  const willSchedule =
    (expiryWhen !== null && expiryWhen.getTime() > now) ||
    (warrantyWhen !== null && warrantyWhen.getTime() > now);

  if (willSchedule) {
    const granted = await requestNotificationPermissionIfNeeded();
    if (!granted) {
      await setItemNotificationIds(itemId, {
        notification_id_expiry: null,
        notification_id_warranty: null,
      });
      return;
    }
  }

  await ensureAndroidChannel();

  let idExpiry: string | null = null;
  let idWarranty: string | null = null;
  const label = escapeTitle(item.title);

  if (expiryWhen && expiryWhen.getTime() > now) {
    idExpiry = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'BanTayi Reminder',
        body: `Your ${label} will expire soon.`,
        data: { itemId: item.id, kind: 'expiry' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: expiryWhen,
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL : undefined,
      },
    });
  }

  if (warrantyWhen && warrantyWhen.getTime() > now) {
    idWarranty = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'BanTayi Warranty Reminder',
        body: `Your ${label} warranty will end soon.`,
        data: { itemId: item.id, kind: 'warranty' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: warrantyWhen,
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL : undefined,
      },
    });
  }

  await setItemNotificationIds(itemId, {
    notification_id_expiry: idExpiry,
    notification_id_warranty: idWarranty,
  });
}

export async function onRemindersGloballyDisabled(): Promise<void> {
  if (Platform.OS === 'web') return;
  await setRemindersEnabled(false);
  await Notifications.cancelAllScheduledNotificationsAsync();
  await clearAllItemNotificationIds();
}

export async function onRemindersGloballyEnabled(): Promise<boolean> {
  const ok = await requestNotificationPermissionIfNeeded();
  if (!ok) return false;
  await setRemindersEnabled(true);
  const items = await getAllItems();
  for (const it of items) {
    await syncRemindersAfterItemChange(it.id);
  }
  return true;
}
