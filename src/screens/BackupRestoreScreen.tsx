import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  AppText,
  AppTextInput,
  FormKeyboardAvoidingScroll,
  GlassCard,
  GlassHeader,
  ScreenBackground,
} from '@/src/components';
import { colors, spacing } from '@/src/constants/colors';
import { createEncryptedBackup, pickAndRestoreEncryptedBackup } from '@/src/services';

export default function BackupRestoreScreen() {
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);

  const createBackup = async () => {
    setBusy('backup');
    try {
      const result = await createEncryptedBackup(backupPassphrase);
      Alert.alert(
        'Backup created',
        result.savedToFileManager
          ? `${result.itemCount} items and ${result.assetCount} files were saved to ${result.filename}.`
          : result.shared
            ? `${result.itemCount} items and ${result.assetCount} files were packed into ${result.filename}.`
            : `${result.itemCount} items and ${result.assetCount} files were saved at ${result.uri}.`,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not create backup.';
      Alert.alert('Backup failed', message);
    } finally {
      setBusy(null);
    }
  };

  const restoreBackup = () => {
    Alert.alert(
      'Replace current vault?',
      'Restoring a backup will replace the items currently saved on this phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy('restore');
              try {
                const result = await pickAndRestoreEncryptedBackup(restorePassphrase);
                if (!result) return;
                Alert.alert(
                  'Restore complete',
                  `${result.itemCount} items and ${result.assetCount} files were restored to this device.`,
                );
              } catch (e) {
                const message = e instanceof Error ? e.message : 'Could not restore backup.';
                Alert.alert('Restore failed', message);
              } finally {
                setBusy(null);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <GlassHeader title="Backup & Restore" back brand={false} />
        <FormKeyboardAvoidingScroll contentContainerStyle={styles.scroll}>
          <View style={styles.headerBlock}>
            <AppText variant="display" color={colors.primary}>
              Offline transfer
            </AppText>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              Create an encrypted file you can move to a new phone yourself.
            </AppText>
          </View>

          <GlassCard radius="xxl" tone="strong">
            <View style={styles.cardHead}>
              <MaterialIcons name="ios-share" size={22} color={colors.primary} />
              <AppText variant="headlineMd" color={colors.primary}>
                Create Backup
              </AppText>
            </View>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              Includes vault items, photos, custom logos, profile details, and reminder settings.
            </AppText>
            <AppTextInput
              label="Backup Passphrase"
              value={backupPassphrase}
              onChangeText={setBackupPassphrase}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              leadingIcon="lock"
              hint="Use at least 8 characters. You need this to restore."
            />
            <AppButton
              variant="primary"
              loading={busy === 'backup'}
              disabled={busy !== null}
              onPress={() => void createBackup()}>
              Create encrypted backup
            </AppButton>
          </GlassCard>

          <GlassCard radius="xxl">
            <View style={styles.cardHead}>
              <MaterialIcons name="restore" size={22} color={colors.primary} />
              <AppText variant="headlineMd" color={colors.primary}>
                Restore Backup
              </AppText>
            </View>
            <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
              Choose a `.bantayi` backup file and enter the passphrase used when it was created.
            </AppText>
            <AppTextInput
              label="Backup Passphrase"
              value={restorePassphrase}
              onChangeText={setRestorePassphrase}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              leadingIcon="key"
            />
            <AppButton
              variant="destructive"
              loading={busy === 'restore'}
              disabled={busy !== null}
              onPress={restoreBackup}>
              Pick file and restore
            </AppButton>
          </GlassCard>
        </FormKeyboardAvoidingScroll>
      </SafeAreaView>
    </ScreenBackground>
  );
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
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});
