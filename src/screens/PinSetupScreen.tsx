import { MaterialIcons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  AppText,
  BantayHeroLogo,
  GlassCard,
  NumberPad,
  PinDots,
  ScreenBackground,
} from '@/src/components';
import { colors, spacing } from '@/src/constants/colors';
import { ROUTES } from '@/src/constants/routes';
import { PIN_LENGTH, setPin as persistPin } from '@/src/services/pin-lock';
import { isProfileConfigured } from '@/src/services/profile';

type Step = 'create' | 'confirm';

export default function PinSetupScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [step, setStep] = useState<Step>('create');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const current = step === 'create' ? pin : confirm;
  const setCurrent = step === 'create' ? setPin : setConfirm;

  const onPress = useCallback(
    (digit: string) => {
      setError(null);
      setCurrent((prev: string) => {
        if (prev.length >= PIN_LENGTH) return prev;
        return prev + digit;
      });
    },
    [setCurrent],
  );

  const onBackspace = useCallback(() => {
    setError(null);
    setCurrent((prev: string) => prev.slice(0, -1));
  }, [setCurrent]);

  const proceed = useCallback(async () => {
    if (step === 'create') {
      if (pin.length !== PIN_LENGTH) {
        setError(`Enter all ${PIN_LENGTH} digits.`);
        return;
      }
      setStep('confirm');
      return;
    }
    if (confirm.length !== PIN_LENGTH) {
      setError(`Enter all ${PIN_LENGTH} digits.`);
      return;
    }
    if (pin !== confirm) {
      setError('PINs do not match. Try again.');
      setConfirm('');
      return;
    }
    setSaving(true);
    try {
      await persistPin(pin);
      setPin('');
      setConfirm('');
      if (returnTo) {
        router.replace(returnTo as Href);
        return;
      }
      const profileConfigured = await isProfileConfigured();
      router.replace(profileConfigured ? ROUTES.home : ROUTES.profileSetup);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save PIN.';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }, [confirm, pin, returnTo, router, step]);

  const subtitle =
    step === 'create'
      ? 'Create a 4-digit PIN to keep your private vault private.'
      : 'Re-enter your PIN to confirm.';

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <BantayHeroLogo size={140} />

          <View style={styles.headingBlock}>
            <AppText variant="display" color={colors.primary} center>
              {step === 'create' ? 'Secure your vault' : 'Confirm PIN'}
            </AppText>
            <AppText
              variant="bodyMd"
              color={colors.onSurfaceVariant}
              center
              style={styles.subtitle}>
              {subtitle}
            </AppText>
          </View>

          <PinDots length={PIN_LENGTH} filled={current.length} error={!!error} />

          {error ? (
            <GlassCard accentBar={colors.error} padded="sm" style={styles.errorCard}>
              <AppText variant="labelMd" color={colors.error} center>
                {error}
              </AppText>
            </GlassCard>
          ) : null}

          <NumberPad onPress={onPress} onBackspace={onBackspace} disabled={saving} />

          <AppButton
            variant="primary"
            loading={saving}
            disabled={saving}
            onPress={() => void proceed()}
            style={styles.cta}>
            {step === 'create' ? 'Continue' : 'Create PIN'}
          </AppButton>

          <View style={styles.footnote}>
            <MaterialIcons name="info-outline" size={14} color={colors.onSurfaceVariant} />
            <AppText variant="labelSm" color={colors.onSurfaceVariant} uppercase>
              Your data stays only on this phone.
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
    maxWidth: 280,
  },
  errorCard: {
    width: '100%',
  },
  cta: {
    width: '100%',
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
  },
});
