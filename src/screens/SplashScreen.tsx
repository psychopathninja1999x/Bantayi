import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  AppText,
  BantayHeroLogo,
  GlassCard,
  ScreenBackground,
} from '@/src/components';
import { colors, spacing } from '@/src/constants/colors';
import { ROUTES } from '@/src/constants/routes';

export default function SplashScreen() {
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <BantayHeroLogo size={180} />

          <View style={styles.brandBlock}>
            <AppText variant="display" color={colors.primary} center>
              BanTayi
            </AppText>
            <AppText
              variant="bodyLg"
              color={colors.onSurfaceVariant}
              center
              style={styles.tagline}>
              Your private vault for expiries, receipts, and warranties.
            </AppText>
          </View>

          <View style={styles.bento}>
            <FeatureChip icon="security" label="Encrypted" />
            <FeatureChip icon="cloud-off" label="Offline" />
          </View>

          <View style={styles.actions}>
            <Link href={ROUTES.pinSetup} asChild>
              <Pressable accessibilityRole="button">
                {({ pressed }) => (
                  <AppButton
                    variant="accent"
                    trailingIcon="arrow-forward"
                    style={pressed ? { opacity: 0.96 } : undefined}>
                    Get started
                  </AppButton>
                )}
              </Pressable>
            </Link>
            <View style={styles.row}>
              <View style={styles.divider} />
              <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
                No account · No cloud · No tracking
              </AppText>
              <View style={styles.divider} />
            </View>
          </View>

          <View style={styles.foot}>
            <MaterialIcons name="lock" size={14} color={colors.primary} />
            <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
              Secure local storage only
            </AppText>
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

interface FeatureChipProps {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
}

function FeatureChip({ icon, label }: FeatureChipProps) {
  return (
    <GlassCard radius="xl" padded="md" style={styles.feature}>
      <MaterialIcons name={icon} size={24} color={colors.primary} />
      <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
        {label}
      </AppText>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagline: {
    maxWidth: 280,
  },
  bento: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 360,
  },
  feature: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outlineVariant,
    opacity: 0.6,
  },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primaryFixed,
    opacity: 0.85,
  },
});
