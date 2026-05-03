import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useColorScheme,
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
import { ROUTES, colors, hrefItemDetails, radii, spacing } from '@/src/constants';
import { getColors } from '@/src/constants/colors';
import { getAllItems } from '@/src/database';
import {
  countActiveItems,
  countExpiredItems,
  countExpiringSoonItems,
  formatItemCategoryLine,
  itemDeadline,
  selectUpcomingReminderItems,
  statusToneForItem,
} from '@/src/utils/item-helpers';
import { localTodayISO } from '@/src/database/date-helpers';
import { getProfile, type UserProfile } from '@/src/services/profile';

const BANTAYI_SPRITES = {
  hi: require('../../assets/images/BanTayiSprites/Hijusttalk.png'),
  talk: require('../../assets/images/BanTayiSprites/JustTalk.png'),
  reminders: require('../../assets/images/BanTayiSprites/IDReminders.png'),
  noPending: require('../../assets/images/BanTayiSprites/NoPending.png'),
  secure: require('../../assets/images/BanTayiSprites/EverythingsGood.png'),
} satisfies Record<string, ImageSourcePropType>;

const BANTAYI_MOTION_FRAMES = [
  { offsetX: 0, offsetY: 0, rotate: '0deg' },
  { offsetX: 3, offsetY: -3, rotate: '-1deg' },
  { offsetX: -2, offsetY: 1, rotate: '1deg' },
  { offsetX: 2, offsetY: -1, rotate: '0deg' },
] as const;

interface AssistantMessage {
  text: string;
  sprite: ImageSourcePropType;
}

const FRIENDLY_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatShortDate(iso: string | null): string {
  if (!iso) return '';
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return iso;
  return `${FRIENDLY_MONTHS[m - 1]} ${String(d).padStart(2, '0')}`;
}

function daysBetweenISO(fromIso: string, toIso: string | null): number | null {
  if (!toIso) return null;
  const a = fromIso.split('-').map(Number);
  const b = toIso.split('-').map(Number);
  if (a.length !== 3 || b.length !== 3) return null;
  const dA = new Date(a[0], a[1] - 1, a[2]).getTime();
  const dB = new Date(b[0], b[1] - 1, b[2]).getTime();
  return Math.round((dB - dA) / (24 * 60 * 60 * 1000));
}

function greetingForNow(nickname?: string): string {
  const h = new Date().getHours();
  const suffix = nickname ? `, ${nickname}` : '';
  if (h < 5) return `Good night${suffix}`;
  if (h < 12) return `Good morning${suffix}`;
  if (h < 17) return `Good afternoon${suffix}`;
  if (h < 21) return `Good evening${suffix}`;
  return `Good night${suffix}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Awaited<ReturnType<typeof getAllItems>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const all = await getAllItems();
      setItems(all);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not read database.';
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
      void getProfile().then(setProfile).catch(() => setProfile(null));
    }, [load]),
  );

  const activeCount = countActiveItems(items);
  const soonCount = countExpiringSoonItems(items);
  const expiredCount = countExpiredItems(items);
  const upcoming = selectUpcomingReminderItems(items).slice(0, 4);

  const today = localTodayISO();
  const nickname = profile?.nickname;
  const assistantMessages: AssistantMessage[] = [
    ...(expiredCount > 0
      ? [
          {
            text: `${expiredCount} item${expiredCount === 1 ? '' : 's'} need attention. Open the vault when you are ready to update or renew.`,
            sprite: BANTAYI_SPRITES.talk,
          },
        ]
      : []),
    {
      text: `${nickname ? `${nickname}, tap` : 'Tap'} the + button in the tab bar when you want me to watch a receipt, ID, warranty, or expiry date.`,
      sprite: BANTAYI_SPRITES.hi,
    },
    upcoming.length === 0
      ? {
          text: 'No deadlines today. I will keep watching your vault.',
          sprite: BANTAYI_SPRITES.noPending,
        }
      : {
          text: `${upcoming.length} upcoming reminder${upcoming.length === 1 ? '' : 's'} need your attention.`,
          sprite: BANTAYI_SPRITES.reminders,
        },
    expiredCount > 0
      ? {
          text: 'I will keep those attention items visible until you update, renew, or archive them.',
          sprite: BANTAYI_SPRITES.reminders,
        }
      : {
          text: 'BanTayi is a secure, offline-first vault. Your data stays on this device.',
          sprite: BANTAYI_SPRITES.secure,
        },
  ];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader brand />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.greetBlock}>
            <AppText variant="display" color={colors.primary}>
              {greetingForNow(nickname)}!
            </AppText>
            <AppText variant="bodyLg" color={colors.onSurfaceVariant}>
              Your vault is secure and everything is up to date.
            </AppText>
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : null}

          {error ? (
            <GlassCard accentBar={colors.error} style={styles.errorCard}>
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

          {!loading && !error ? (
            <View style={styles.statsGrid}>
              <SummaryCard
                accent={colors.primary}
                icon="check-circle"
                iconColor={colors.primary}
                label="Active items"
                value={activeCount}
                valueColor={colors.primary}
              />
              <SummaryCard
                accent={colors.tertiaryFixedDim}
                icon="warning-amber"
                iconColor={colors.onTertiaryFixedVariant}
                label="Expiring soon"
                value={soonCount}
                valueColor={colors.onTertiaryFixedVariant}
              />
              <SummaryCard
                accent={colors.error}
                icon="error-outline"
                iconColor={colors.error}
                label="Expired"
                value={expiredCount}
                valueColor={colors.error}
              />
            </View>
          ) : null}

          {!loading && !error ? <BanTayiAssistant messages={assistantMessages} /> : null}

          <View style={styles.sectionHeader}>
            <AppText variant="headlineMd" color={colors.primary}>
              Upcoming reminders
            </AppText>
            <Pressable onPress={() => router.push(ROUTES.vault)} hitSlop={8}>
              <AppText variant="labelMd" color={colors.primary}>
                View all
              </AppText>
            </Pressable>
          </View>

          {!loading && !error && upcoming.length === 0 ? (
            <GlassCard>
              <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
                No deadlines in the next 90 days. Add items to stay ahead.
              </AppText>
            </GlassCard>
          ) : null}

          {upcoming.map((item) => {
            const tone = statusToneForItem(item);
            const deadline = itemDeadline(item);
            const days = daysBetweenISO(today, deadline);
            const daysLabel =
              days == null
                ? ''
                : days < 0
                  ? `${Math.abs(days)}d overdue`
                  : days === 0
                    ? 'Due today'
                    : `${days} day${days === 1 ? '' : 's'} left`;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => router.push(hrefItemDetails(item.id))}
                style={({ pressed }) => [pressed && styles.rowPressed]}>
                <GlassCard padded="md">
                  <View style={styles.reminderRow}>
                    <View style={styles.reminderLeft}>
                      <ItemLogo
                        category={item.category}
                        subcategory={item.subcategory}
                        logoUri={item.logo_uri}
                        size={48}
                      />
                      <View style={styles.reminderTextCol}>
                        <AppText variant="headlineMd" color={colors.onSurface} numberOfLines={1}>
                          {item.title}
                        </AppText>
                        <AppText
                          variant="labelSm"
                          color={colors.onSurfaceVariant}
                          uppercase
                          style={{ marginTop: 4 }}>
                          {formatItemCategoryLine(item)}
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.reminderRight}>
                      <StatusBadge tone={tone} label={daysLabel || undefined} />
                      {deadline ? (
                        <AppText
                          variant="labelSm"
                          color={colors.onSurfaceVariant}
                          style={{ marginTop: 6 }}>
                          {tone === 'expired' ? 'Expired ' : 'Expires '}
                          {formatShortDate(deadline)}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}

          <GlassCard tone="strong" radius="xxl" style={styles.privacyCard}>
            <View style={styles.privacyRow}>
              <View style={styles.privacyIcon}>
                <MaterialIcons name="lock" size={28} color={colors.onPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="headlineMd" color={colors.primary}>
                  Privacy first
                </AppText>
                <AppText
                  variant="bodyMd"
                  color={colors.onSurfaceVariant}
                  style={{ marginTop: 4 }}>
                  All your data is encrypted and stored locally on this device only.
                </AppText>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function BanTayiAssistant({ messages }: { messages: AssistantMessage[] }) {
  const scheme = useColorScheme();
  const palette = getColors(scheme);
  const [messageIndex, setMessageIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setMessageIndex(0);
  }, [messages]);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((current) => (current + 1) % messages.length);
    }, 4200);
    return () => clearInterval(messageTimer);
  }, [messages.length]);

  useEffect(() => {
    const frameTimer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % BANTAYI_MOTION_FRAMES.length);
    }, 650);
    return () => clearInterval(frameTimer);
  }, []);

  const frame = BANTAYI_MOTION_FRAMES[frameIndex];
  const message = messages[messageIndex] ?? messages[0];

  return (
    <GlassCard tone="strong" radius="xxl" style={styles.assistantCard}>
      <View style={styles.assistantRow}>
        <View style={styles.spriteWrap}>
          <Image
            source={message?.sprite ?? BANTAYI_SPRITES.talk}
            style={[
              styles.sprite,
              {
                transform: [
                  { translateX: frame.offsetX },
                  { translateY: frame.offsetY },
                  { rotate: frame.rotate },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </View>
        <View
          style={[
            styles.speechBubble,
            {
              backgroundColor: palette.surfaceContainerLowest,
              borderColor: palette.glassBorder,
            },
          ]}>
          <View
            style={[
              styles.speechTail,
              {
                backgroundColor: palette.surfaceContainerLowest,
                borderColor: palette.glassBorder,
              },
            ]}
          />
          <AppText variant="labelMd" color={palette.onSurface} style={styles.bubbleText}>
            {message?.text ?? ''}
          </AppText>
        </View>
      </View>
    </GlassCard>
  );
}

interface SummaryCardProps {
  accent: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor: string;
  label: string;
  value: number;
  valueColor: string;
}

function SummaryCard({ accent, icon, iconColor, label, value, valueColor }: SummaryCardProps) {
  return (
    <View style={styles.summaryCol}>
      <GlassCard accentBar={accent} radius="lg" padded="sm" style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryIconWrap}>
            <MaterialIcons name={icon} size={18} color={iconColor} />
          </View>
          <AppText variant="headlineMd" color={valueColor} style={styles.summaryValue}>
            {value}
          </AppText>
        </View>
        <AppText
          variant="labelSm"
          color={colors.onSurfaceVariant}
          style={styles.summaryLabel}
          numberOfLines={2}>
          {label}
        </AppText>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  greetBlock: {
    gap: 4,
    paddingTop: spacing.sm,
  },
  centered: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  errorCard: {
    borderColor: colors.error,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  summaryCol: {
    flex: 1,
    alignSelf: 'stretch',
  },
  summaryCard: {
    height: 88,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  summaryValue: {
    lineHeight: 30,
  },
  assistantCard: {
    overflow: 'visible',
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  spriteWrap: {
    width: 116,
    minHeight: 136,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sprite: {
    width: 128,
    height: 136,
  },
  speechBubble: {
    flex: 1,
    minHeight: 92,
    justifyContent: 'center',
    position: 'relative',
    borderRadius: radii.lg,
    borderTopLeftRadius: radii.sm,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  speechTail: {
    position: 'absolute',
    left: -8,
    top: 18,
    width: 14,
    height: 14,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  bubbleText: {
    flexShrink: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  rowPressed: {
    opacity: 0.92,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  reminderTextCol: {
    flexShrink: 1,
    flex: 1,
  },
  reminderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  privacyCard: {
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  privacyIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
