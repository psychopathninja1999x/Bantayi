import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import {
  AppButton,
  AppText,
  AppTextInput,
  BantayHeroLogo,
  FormKeyboardAvoidingScroll,
  GlassCard,
  ScreenBackground,
} from '@/src/components';
import { colors, spacing } from '@/src/constants/colors';
import { ROUTES } from '@/src/constants/routes';
import { requestInitialReminderPermissionIfNeeded } from '@/src/services';
import { saveProfile } from '@/src/services/profile';
import { parseOptionalISODate } from '@/src/utils/dates';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [birthdayPickerOpen, setBirthdayPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = useCallback(async () => {
    setError(null);
    const parsedBirthday = parseOptionalISODate(birthday);
    if (!fullName.trim()) return setError('Full name is required.');
    if (!nickname.trim()) return setError('Nickname is required.');
    if (!parsedBirthday.ok || !parsedBirthday.value) {
      return setError('Birthday must use YYYY-MM-DD.');
    }

    setSaving(true);
    try {
      await saveProfile({
        fullName,
        nickname,
        birthday: parsedBirthday.value,
      });
      await requestInitialReminderPermissionIfNeeded();
      router.replace(ROUTES.home);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save profile.';
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  }, [birthday, fullName, nickname, router]);

  const birthdayDate = birthday ? parseISOToDate(birthday) : new Date(2000, 0, 1);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <FormKeyboardAvoidingScroll
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}>
          <BantayHeroLogo size={120} />
          <View style={styles.headingBlock}>
            <AppText variant="display" color={colors.primary} center>
              Tell BanTayi about you
            </AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant} center style={styles.subtitle}>
              Basic profile only. This stays on your device.
            </AppText>
          </View>

          {error ? (
            <GlassCard accentBar={colors.error} padded="sm" style={styles.errorCard}>
              <AppText variant="labelMd" color={colors.error} center>
                {error}
              </AppText>
            </GlassCard>
          ) : null}

          <View style={styles.form}>
            <AppTextInput
              label="Full name"
              placeholder="e.g. Mark Cruz"
              value={fullName}
              onChangeText={(value) => {
                setFullName(value);
                if (error) setError(null);
              }}
              autoCapitalize="words"
            />
            <AppTextInput
              label="Nickname"
              placeholder="e.g. Mark"
              value={nickname}
              onChangeText={(value) => {
                setNickname(value);
                if (error) setError(null);
              }}
              autoCapitalize="words"
            />
            <DatePickerField
              label="Birthday"
              value={birthday}
              onPress={() => setBirthdayPickerOpen(true)}
              onClear={() => {
                setBirthday('');
                setBirthdayPickerOpen(false);
                if (error) setError(null);
              }}
            />
          </View>

          <AppButton
            variant="primary"
            loading={saving}
            disabled={saving}
            onPress={() => void submit()}
            style={styles.cta}>
            Continue
          </AppButton>
        </FormKeyboardAvoidingScroll>
        {birthdayPickerOpen && Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible onRequestClose={() => setBirthdayPickerOpen(false)}>
            <Pressable style={styles.modalBackdrop} onPress={() => setBirthdayPickerOpen(false)} />
            <View style={[styles.iosPickerSheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <View style={styles.iosPickerHeader}>
                <AppButton
                  variant="ghost"
                  size="md"
                  onPress={() => {
                    setBirthday('');
                    setBirthdayPickerOpen(false);
                  }}>
                  Clear
                </AppButton>
                <AppButton variant="primary" size="md" onPress={() => setBirthdayPickerOpen(false)}>
                  Done
                </AppButton>
              </View>
              <DateTimePicker
                value={birthdayDate}
                mode="date"
                display="inline"
                maximumDate={new Date()}
                textColor={colors.onSurface}
                onChange={(_, selectedDate) => {
                  if (!selectedDate) return;
                  setBirthday(formatDateValue(selectedDate));
                  if (error) setError(null);
                }}
                style={styles.iosPicker}
              />
            </View>
          </Modal>
        ) : null}
        {birthdayPickerOpen && Platform.OS !== 'ios' ? (
          <DateTimePicker
            value={birthdayDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setBirthdayPickerOpen(false);
              if (event.type === 'dismissed' || !selectedDate) return;
              setBirthday(formatDateValue(selectedDate));
              if (error) setError(null);
            }}
          />
        ) : null}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function parseISOToDate(value: string): Date {
  const parsed = parseOptionalISODate(value);
  if (!parsed.ok || !parsed.value) return new Date(2000, 0, 1);
  const [year, month, day] = parsed.value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface DatePickerFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  onClear: () => void;
}

function DatePickerField({ label, value, onPress, onClear }: DatePickerFieldProps) {
  return (
    <View style={styles.dateField}>
      <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant} style={styles.dateLabel}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.dateButton, pressed && { opacity: 0.86 }]}>
        <MaterialIcons name="calendar-today" size={19} color={colors.primaryContainer} />
        <AppText
          variant="labelMd"
          color={value ? colors.onSurface : colors.outline}
          numberOfLines={1}
          style={styles.dateText}>
          {value || 'Pick date'}
        </AppText>
        {value ? (
          <Pressable accessibilityRole="button" onPress={onClear} hitSlop={8}>
            <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
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
  form: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  errorCard: {
    width: '100%',
  },
  cta: {
    width: '100%',
    marginTop: 'auto',
  },
  dateField: {
    gap: 6,
  },
  dateLabel: {
    paddingHorizontal: 4,
  },
  dateButton: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassFill,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  iosPickerSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  iosPicker: {
    minHeight: 340,
  },
});
