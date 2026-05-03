import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors, spacing } from '@/src/constants/colors';

import { AppText } from './Text';
import { BantayLogo } from './BantayLogo';

export interface GlassHeaderProps {
  /** Show the brand mark + name (Home/Vault/Settings). */
  brand?: boolean;
  /** Override title text. Defaults to "BanTayi" when brand is true. */
  title?: string;
  /** Show a back button on the left (used inside modal screens). */
  back?: boolean;
  /** Right-side cluster (e.g. action buttons, avatars). */
  right?: ReactNode;
  /** Tag inside header (e.g. "Offline only"). */
  tag?: string;
}

export function GlassHeader({ brand = true, title, back, right, tag }: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = getColors(scheme);
  const isDark = scheme === 'dark';

  const onBack = () => {
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, borderBottomColor: palette.glassBorderSoft }]}>
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={isDark ? 28 : 48}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.fill,
          { backgroundColor: isDark ? palette.glassFillStrong : palette.glassFill },
        ]}
      />
      <View style={styles.row}>
        <View style={styles.leftCol}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && { backgroundColor: palette.glassFillSoft },
              ]}>
              <MaterialIcons name="arrow-back" size={24} color={palette.primary} />
            </Pressable>
          ) : null}
          {brand ? <BantayLogo size={28} style={styles.logo} /> : null}
          <AppText variant="headlineMd" color={palette.primary} style={styles.title} numberOfLines={1}>
            {title ?? (brand ? 'BanTayi' : '')}
          </AppText>
          {tag ? (
            <View style={[styles.tag, { backgroundColor: palette.surfaceContainerHighest }]}>
              <MaterialIcons name="cloud-off" size={12} color={palette.onSurfaceVariant} />
              <AppText
                variant="labelSm"
                color={palette.onSurfaceVariant}
                uppercase
                style={styles.tagText}>
                {tag}
              </AppText>
            </View>
          ) : null}
        </View>
        <View style={styles.rightCol}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    borderBottomWidth: 1,
  },
  fill: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: 56,
  },
  leftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  logo: {
    width: 28,
    height: 28,
  },
  title: {
    flexShrink: 1,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 10,
  },
});
