import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  AppText,
  GlassCard,
  GlassHeader,
  ItemLogo,
  ScreenBackground,
  StatusBadge,
} from '@/src/components';
import { colors, hrefItemDetails, radii, spacing } from '@/src/constants';
import { getAllItems } from '@/src/database';
import type { Item } from '@/src/types';
import {
  buildItemNotifications,
  labelForNotification,
  type ItemNotification,
} from '@/src/utils/notifications';

function formatDate(iso: string): string {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parts[0], parts[1] - 1, parts[2]));
}

function iconFor(notification: ItemNotification): React.ComponentProps<typeof MaterialIcons>['name'] {
  if (notification.urgency === 'overdue') return 'error-outline';
  if (notification.urgency === 'today' || notification.urgency === 'soon') return 'notification-important';
  return notification.kind === 'warranty' ? 'verified-user' : 'event';
}

function toneFor(notification: ItemNotification): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (notification.urgency === 'overdue') return 'expired';
  if (notification.urgency === 'today' || notification.urgency === 'soon') return 'expiring_soon';
  return notification.scheduled ? 'active' : 'archived';
}

export default function NotificationScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const all = await getAllItems();
      setItems(all);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not read notifications.';
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const notifications = useMemo(() => buildItemNotifications(items), [items]);
  const attentionCount = notifications.filter((n) =>
    ['overdue', 'today', 'soon'].includes(n.urgency),
  ).length;

  const renderItem: ListRenderItem<ItemNotification> = useCallback(
    ({ item }) => (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(hrefItemDetails(item.item.id))}
        style={({ pressed }) => [styles.rowWrap, pressed && styles.rowPressed]}>
        <GlassCard radius="xxl" padded="md">
          <View style={styles.rowInner}>
            <View style={styles.iconStack}>
              <ItemLogo
                category={item.item.category}
                subcategory={item.item.subcategory}
                logoUri={item.item.logo_uri}
                size={52}
              />
              <View style={styles.kindIcon}>
                <MaterialIcons name={iconFor(item)} size={16} color={colors.onPrimary} />
              </View>
            </View>
            <View style={styles.rowText}>
              <AppText variant="headlineMd" color={colors.onSurface} numberOfLines={2}>
                {item.title}
              </AppText>
              <AppText
                variant="labelSm"
                color={colors.onSurfaceVariant}
                uppercase
                style={styles.metaText}>
                {item.kind === 'expiry' ? 'Expiry' : 'Warranty'} - {formatDate(item.deadline)}
              </AppText>
              <AppText variant="labelSm" color={colors.onSurfaceVariant} style={styles.metaText}>
                {item.reminderDate
                  ? `Reminder: ${formatDate(item.reminderDate)} at 9:00 AM`
                  : 'Reminder is not set for this item'}
              </AppText>
            </View>
            <View style={styles.rowRight}>
              <StatusBadge tone={toneFor(item)} label={labelForNotification(item)} />
              <AppText variant="labelSm" color={colors.outline} uppercase style={styles.scheduleLabel}>
                {item.scheduled ? 'Scheduled' : 'Not scheduled'}
              </AppText>
            </View>
          </View>
        </GlassCard>
      </Pressable>
    ),
    [router],
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      <AppText variant="display" color={colors.primary}>
        Notifications
      </AppText>
      <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
        {notifications.length === 0
          ? 'No item deadlines are being watched yet.'
          : `${notifications.length} local reminder${notifications.length === 1 ? '' : 's'}, ${attentionCount} needing attention.`}
      </AppText>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {error ? (
        <GlassCard accentBar={colors.error}>
          <AppText variant="labelMd" color={colors.error}>
            {error}
          </AppText>
          <View style={{ marginTop: spacing.sm }}>
            <AppButton variant="outline" onPress={() => void load()}>
              Try again
            </AppButton>
          </View>
        </GlassCard>
      ) : null}
    </View>
  );

  const listEmpty =
    !loading && !error ? (
      <GlassCard radius="xxl" style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <MaterialIcons name="notifications-none" size={30} color={colors.primary} />
        </View>
        <AppText variant="headlineMd" color={colors.primary}>
          No notifications yet
        </AppText>
        <AppText variant="bodyMd" color={colors.onSurfaceVariant} style={styles.emptyText}>
          Add an item with an expiry date or warranty date to see reminders here.
        </AppText>
      </GlassCard>
    ) : null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader title="Notifications" back brand={false} notifications={false} />
        <FlatList
          data={error ? [] : notifications}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  loader: {
    paddingVertical: spacing.sm,
  },
  rowWrap: {
    width: '100%',
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconStack: {
    width: 58,
    height: 58,
  },
  kindIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
  },
  rowText: {
    flex: 1,
    flexShrink: 1,
  },
  metaText: {
    marginTop: 4,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: 128,
  },
  scheduleLabel: {
    textAlign: 'right',
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyText: {
    marginTop: 4,
    textAlign: 'center',
  },
});
