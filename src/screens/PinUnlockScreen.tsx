import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  BantayHeroLogo,
  GlassCard,
  NumberPad,
  PinDots,
  ScreenBackground,
} from '@/src/components';
import { colors, spacing } from '@/src/constants/colors';
import { ROUTES } from '@/src/constants/routes';
import {
  MAX_ATTEMPTS,
  PIN_LENGTH,
  getLockoutRemainingMs,
  verifyPin,
} from '@/src/services/pin-lock';

export default function PinUnlockScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const refreshLockout = useCallback(async () => {
    const ms = await getLockoutRemainingMs();
    setLockSeconds(Math.ceil(ms / 1000));
  }, []);

  useEffect(() => {
    void refreshLockout();
  }, [refreshLockout]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setInterval(() => {
      void refreshLockout();
    }, 1000);
    return () => clearInterval(t);
  }, [lockSeconds, refreshLockout]);

  const submit = useCallback(
    async (entered: string) => {
      setError(null);
      if (lockSeconds > 0) return;
      if (entered.length !== PIN_LENGTH) {
        setError(`Enter all ${PIN_LENGTH} digits.`);
        return;
      }
      setSubmitting(true);
      try {
        const result = await verifyPin(entered);
        if (result.ok) {
          setPin('');
          router.replace(ROUTES.home);
          return;
        }
        setPin('');
        if (result.reason === 'lockout') {
          await refreshLockout();
          setError(
            `Too many incorrect attempts. Wait ${Math.ceil(result.msRemaining / 1000)} seconds.`,
          );
          return;
        }
        setError(
          `Incorrect PIN. Attempts left: ${Math.max(0, result.attemptsRemaining)} / ${MAX_ATTEMPTS}.`,
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not verify PIN.';
        Alert.alert('Error', message);
      } finally {
        setSubmitting(false);
      }
    },
    [lockSeconds, refreshLockout, router],
  );

  const onPress = useCallback(
    (digit: string) => {
      if (submitting || lockSeconds > 0) return;
      setError(null);
      setPin((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = prev + digit;
        if (next.length === PIN_LENGTH) {
          void submit(next);
        }
        return next;
      });
    },
    [lockSeconds, submit, submitting],
  );

  const onBackspace = useCallback(() => {
    if (submitting) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [submitting]);

  const locked = lockSeconds > 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <BantayHeroLogo size={140} />
          <View style={styles.headingBlock}>
            <AppText variant="display" color={colors.primary} center>
              Welcome back
            </AppText>
            <AppText
              variant="bodyMd"
              color={colors.onSurfaceVariant}
              center
              style={styles.subtitle}>
              Enter your 4-digit PIN to open your vault.
            </AppText>
          </View>

          <PinDots length={PIN_LENGTH} filled={pin.length} error={!!error} />

          {locked ? (
            <GlassCard accentBar={colors.tertiary} padded="sm" style={styles.card}>
              <AppText variant="labelMd" color={colors.onTertiaryFixedVariant} center>
                Locked — try again in {lockSeconds} seconds.
              </AppText>
            </GlassCard>
          ) : null}

          {error && !locked ? (
            <GlassCard accentBar={colors.error} padded="sm" style={styles.card}>
              <AppText variant="labelMd" color={colors.error} center>
                {error}
              </AppText>
            </GlassCard>
          ) : null}

          <NumberPad
            onPress={onPress}
            onBackspace={onBackspace}
            disabled={locked || submitting}
          />

          <View style={styles.footnote}>
            <MaterialIcons name="lock" size={14} color={colors.onSurfaceVariant} />
            <AppText variant="labelSm" color={colors.onSurfaceVariant} uppercase>
              Stored locally on this device.
            </AppText>
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headingBlock: {
    alignItems: 'center',
    gap: 4,
  },
  subtitle: {
    maxWidth: 300,
  },
  card: {
    width: '100%',
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
  },
});
