import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import type { StyleProp, ViewProps, ViewStyle } from 'react-native';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';

import { colors, getColors, radii, spacing } from '@/src/constants/colors';

export type GlassCardTone = 'default' | 'soft' | 'strong';

export interface GlassCardProps extends ViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Inner padding helpers (default: medium 24px). Set to false to disable. */
  padded?: boolean | 'sm' | 'md' | 'lg';
  /** Border radius preset (default: xl 24px). */
  radius?: 'lg' | 'xl' | 'xxl' | number;
  /** Visual density of the glass fill. */
  tone?: GlassCardTone;
  /** Optional left accent stripe color (e.g. summary cards). */
  accentBar?: string;
  /** Disable the inner shadow + soft glow. */
  flat?: boolean;
}

export function GlassCard({
  children,
  style,
  padded = 'md',
  radius = 'xl',
  tone = 'default',
  accentBar,
  flat = false,
  ...rest
}: GlassCardProps) {
  const scheme = useColorScheme();
  const palette = getColors(scheme);
  const isDark = scheme === 'dark';
  const radiusValue =
    typeof radius === 'number'
      ? radius
      : radius === 'xxl'
        ? radii.xxl
        : radius === 'lg'
          ? radii.lg
          : radii.xl;

  const padValue =
    padded === false
      ? 0
      : padded === 'sm'
        ? spacing.sm
        : padded === 'lg'
          ? spacing.lg
          : spacing.md;

  const fill =
    tone === 'soft'
      ? palette.glassFillSoft
      : tone === 'strong'
        ? palette.glassFillStrong
        : palette.glassFill;

  const blurIntensity = isDark
    ? tone === 'strong'
      ? 28
      : 22
    : tone === 'soft'
      ? 30
      : tone === 'strong'
        ? 55
        : 40;

  return (
    <View
      style={[
        styles.wrap,
        { borderRadius: radiusValue, backgroundColor: palette.glassFillSoft },
        !flat && [styles.shadow, { shadowColor: palette.glassShadow }],
        style,
      ]}
      {...rest}>
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={blurIntensity}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderRadius: radiusValue }]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: fill,
            borderRadius: radiusValue,
            borderWidth: 1,
            borderColor: palette.glassBorder,
          },
        ]}
      />
      {accentBar ? (
        <View
          pointerEvents="none"
          style={[
            styles.accent,
            { backgroundColor: accentBar, borderTopLeftRadius: radiusValue, borderBottomLeftRadius: radiusValue },
          ]}
        />
      ) : null}
      <View style={{ padding: padValue }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.glassFillSoft,
  },
  shadow: {
    shadowColor: colors.glassShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 3,
  },
  accent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },
});
