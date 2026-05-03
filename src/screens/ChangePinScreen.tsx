import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  AppText,
  BantayHeroLogo,
  GlassCard,
  GlassHeader,
  NumberPad,
  PinDots,
  ScreenBackground,
} from '@/src/components';
import { colors, spacing } from '@/src/constants/colors';
import { ROUTES } from '@/src/constants/routes';
import { changePin, PIN_LENGTH } from '@/src/services/pin-lock';

type Step = 'current' | 'new' | 'confirm';

const STEP_TITLES: Record<Step, string> = {
  current: 'Enter current PIN',
  new: 'Choose a new PIN',
  confirm: 'Confirm new PIN',
};

const STEP_HINTS: Record<Step, string> = {
  current: 'Verify your identity to continue.',
  new: 'Pick 4 digits you can remember.',
  confirm: 'Re-enter the new PIN to lock it in.',
};

export function ChangePinScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('current');
  const [current, setCurrent] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const value = step === 'current' ? current : step === 'new' ? nextPin : confirm;
  const setValue = step === 'current' ? setCurrent : step === 'new' ? setNextPin : setConfirm;

  const onPress = useCallback(
    (digit: string) => {
      setError(null);
      setValue((prev: string) => {
        if (prev.length >= PIN_LENGTH) return prev;
        return prev + digit;
      });
    },
    [setValue],
  );

  const onBackspace = useCallback(() => {
    setError(null);
    setValue((prev: string) => prev.slice(0, -1));
  }, [setValue]);

  const advance = useCallback(async () => {
    if (value.length !== PIN_LENGTH) {
      setError(`Enter all ${PIN_LENGTH} digits.`);
      return;
    }
    if (step === 'current') {
      setStep('new');
      return;
    }
    if (step === 'new') {
      if (nextPin === current) {
        setError('New PIN must differ from the current PIN.');
        setNextPin('');
        return;
      }
      setStep('confirm');
      return;
    }
    if (nextPin !== confirm) {
      setError('New PIN fields do not match.');
      setConfirm('');
      return;
    }
    setSaving(true);
    try {
      await changePin(current, nextPin);
      Alert.alert('Saved', 'Your PIN has been updated.', [
        {
          text: 'OK',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(ROUTES.settings);
            }
          },
        },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not update PIN.';
      setError(message);
      // Reset to start so user can try again with correct current PIN.
      setCurrent('');
      setNextPin('');
      setConfirm('');
      setStep('current');
    } finally {
      setSaving(false);
    }
  }, [confirm, current, nextPin, router, step, value.length]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader title="Change PIN" back brand={false} />
        <View style={styles.container}>
          <BantayHeroLogo size={120} />

          <View style={styles.headingBlock}>
            <AppText variant="headlineLg" color={colors.primary} center>
              {STEP_TITLES[step]}
            </AppText>
            <AppText
              variant="bodyMd"
              color={colors.onSurfaceVariant}
              center
              style={styles.subtitle}>
              {STEP_HINTS[step]}
            </AppText>
          </View>

          <PinDots length={PIN_LENGTH} filled={value.length} error={!!error} />

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
            onPress={() => void advance()}
            style={styles.cta}>
            {step === 'confirm' ? 'Save new PIN' : 'Continue'}
          </AppButton>
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
    paddingTop: spacing.md,
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
});
