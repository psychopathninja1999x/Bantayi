import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  BantayLogo,
  GlassCard,
  GlassHeader,
  ScreenBackground,
} from '@/src/components';
import { ROUTES } from '@/src/constants';
import { colors, spacing } from '@/src/constants/colors';
import {
  getAppLockEnabled,
  getRemindersEnabled,
  isPinConfigured,
  onRemindersGloballyDisabled,
  onRemindersGloballyEnabled,
  setAppLockEnabled,
} from '@/src/services';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface PrivacyTile {
  icon: IconName;
  title: string;
  body: string;
}

const PRIVACY_TILES: PrivacyTile[] = [
  {
    icon: 'no-accounts',
    title: 'No account',
    body: "Anonymous by default — no email, phone, or social login required.",
  },
  {
    icon: 'cloud-off',
    title: 'No cloud sync',
    body: 'Your vault never leaves the device. No servers, no leaks.',
  },
  {
    icon: 'visibility-off',
    title: 'No tracking',
    body: 'Zero analytics, zero telemetry. Your behavior is yours alone.',
  },
  {
    icon: 'storage',
    title: 'Local storage only',
    body: 'Data lives in the secure on-device store backed by SecureStore.',
  },
];

function displayAppVersion(): string {
  const raw = Constants.expoConfig?.version ?? '1.0.0';
  return raw.replace(/\.0$/, '');
}

export default function SettingsScreen() {
  const router = useRouter();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [appLockOn, setAppLockOn] = useState(false);
  const [remindersOn, setRemindersOn] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [pin, lock, reminders] = await Promise.all([
        isPinConfigured(),
        getAppLockEnabled(),
        getRemindersEnabled(),
      ]);
      setHasPin(pin);
      setAppLockOn(lock);
      setRemindersOn(reminders);
    } catch {
      setHasPin(false);
      setAppLockOn(false);
      setRemindersOn(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const goToPinSetup = useCallback(() => {
    router.push({
      pathname: ROUTES.pinSetup,
      params: { returnTo: ROUTES.settings },
    } as Href);
  }, [router]);

  const onToggleAppLock = async (value: boolean) => {
    try {
      if (value && !hasPin) {
        goToPinSetup();
        return;
      }
      await setAppLockEnabled(value);
      setAppLockOn(value);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', msg);
      await refresh();
    }
  };

  const onToggleReminders = async (value: boolean) => {
    try {
      if (value) {
        const ok = await onRemindersGloballyEnabled();
        setRemindersOn(ok);
        if (!ok) {
          Alert.alert(
            'Permission needed',
            'Notification permission is required for scheduled on-device reminders (no remote push).',
          );
        }
      } else {
        await onRemindersGloballyDisabled();
        setRemindersOn(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      Alert.alert('Error', msg);
      await refresh();
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader title="Settings" brand />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerBlock}>
            <AppText variant="display" color={colors.primary}>
              Security
            </AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              Manage your vault access and on-device protection.
            </AppText>
          </View>

          <GlassCard radius="xxl" padded={false}>
            <RowItem
              icon="lock"
              title="App Lock"
              hint={appLockOn ? 'Require PIN when opening BanTayi' : 'Open BanTayi without PIN unlock'}
              right={
                <Switch
                  accessibilityLabel="Toggle App Lock"
                  value={appLockOn}
                  disabled={hasPin === null}
                  onValueChange={(v) => void onToggleAppLock(v)}
                  trackColor={{
                    false: colors.surfaceContainerHighest,
                    true: colors.primaryContainer,
                  }}
                  thumbColor={colors.surfaceContainerLowest}
                />
              }
            />
            <Divider />
            <RowItem
              icon="notifications"
              title="Local reminders"
              right={
                <Switch
                  accessibilityLabel="Toggle local reminders"
                  value={remindersOn}
                  onValueChange={(v) => void onToggleReminders(v)}
                  trackColor={{
                    false: colors.surfaceContainerHighest,
                    true: colors.primaryContainer,
                  }}
                  thumbColor={colors.surfaceContainerLowest}
                />
              }
            />
            <Divider />
            <Pressable
              onPress={() => {
                if (hasPin) {
                  router.push(ROUTES.changePin);
                } else {
                  goToPinSetup();
                }
              }}
              style={({ pressed }) => [pressed && styles.rowPressed]}>
              <RowItem
                icon="pin"
                title="Change PIN"
                hint={hasPin ? 'Update your 4-digit PIN' : 'Set up a PIN to lock the vault'}
                right={<MaterialIcons name="chevron-right" size={22} color={colors.outline} />}
              />
            </Pressable>
            <Divider />
            <Pressable
              onPress={() => router.push(ROUTES.backupRestore)}
              style={({ pressed }) => [pressed && styles.rowPressed]}>
              <RowItem
                icon="backup"
                title="Backup & Restore"
                hint="Move your encrypted vault file to another phone"
                right={<MaterialIcons name="chevron-right" size={22} color={colors.outline} />}
              />
            </Pressable>
          </GlassCard>

          <View style={styles.headerBlock}>
            <View style={styles.privacyHeader}>
              <MaterialIcons name="verified-user" size={22} color={colors.primary} />
              <AppText variant="headlineMd" color={colors.primary}>
                Privacy &amp; Security
              </AppText>
            </View>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              BanTayi is built around the principle that your data belongs to you.
            </AppText>
          </View>

          <View style={styles.bento}>
            {PRIVACY_TILES.map((t) => (
              <View key={t.title} style={styles.bentoCol}>
                <GlassCard radius="xxl" padded="md" style={styles.bentoCard}>
                  <View style={styles.bentoHead}>
                    <MaterialIcons name={t.icon} size={18} color={colors.primary} />
                    <AppText variant="labelSm" uppercase color={colors.primary}>
                      {t.title}
                    </AppText>
                  </View>
                  <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                    {t.body}
                  </AppText>
                </GlassCard>
              </View>
            ))}
          </View>

          <GlassCard radius="xxl" tone="strong" style={styles.banner}>
            <View style={styles.bannerInner}>
              <View style={styles.bannerBrandRow}>
                <BantayLogo size={56} />
                <AppText variant="headlineLg" color={colors.primary}>
                  BanTayi
                </AppText>
              </View>
              <AppText
                variant="headlineMd"
                color={colors.onSurfaceVariant}
                center
                style={styles.bannerText}>
                Keep Watch Over What Matters
              </AppText>
              <AppText variant="labelSm" color={colors.outline} uppercase>
                Version {displayAppVersion()}
              </AppText>
            </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

interface RowItemProps {
  icon: IconName;
  title: string;
  hint?: string;
  right?: React.ReactNode;
}

function RowItem({ icon, title, hint, right }: RowItemProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <MaterialIcons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyMd" color={colors.onSurface}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="labelSm" color={colors.onSurfaceVariant}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  headerBlock: {
    gap: 4,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.md,
    opacity: 0.6,
  },
  bento: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bentoCol: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  bentoCard: {
    minHeight: 130,
  },
  bentoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  banner: {
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  bannerInner: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  bannerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bannerText: {
    paddingHorizontal: spacing.md,
  },
});
