import type { TextProps, TextStyle } from 'react-native';
import { Text as RNText, StyleSheet } from 'react-native';

import { colors, fontFamily, typography } from '@/src/constants/colors';

export type TypographyVariant =
  | 'display'
  | 'headlineLg'
  | 'headlineMd'
  | 'bodyLg'
  | 'bodyMd'
  | 'labelMd'
  | 'labelSm';

const VARIANT_STYLES: Record<TypographyVariant, TextStyle> = {
  display: {
    fontSize: typography.display.size,
    lineHeight: typography.display.lineHeight,
    letterSpacing: typography.display.letterSpacing,
    fontFamily: fontFamily.semibold,
    fontWeight: typography.display.weight,
  },
  headlineLg: {
    fontSize: typography.headlineLg.size,
    lineHeight: typography.headlineLg.lineHeight,
    letterSpacing: typography.headlineLg.letterSpacing,
    fontFamily: fontFamily.medium,
    fontWeight: typography.headlineLg.weight,
  },
  headlineMd: {
    fontSize: typography.headlineMd.size,
    lineHeight: typography.headlineMd.lineHeight,
    fontFamily: fontFamily.medium,
    fontWeight: typography.headlineMd.weight,
  },
  bodyLg: {
    fontSize: typography.bodyLg.size,
    lineHeight: typography.bodyLg.lineHeight,
    fontFamily: fontFamily.regular,
    fontWeight: typography.bodyLg.weight,
  },
  bodyMd: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.lineHeight,
    fontFamily: fontFamily.regular,
    fontWeight: typography.bodyMd.weight,
  },
  labelMd: {
    fontSize: typography.labelMd.size,
    lineHeight: typography.labelMd.lineHeight,
    letterSpacing: typography.labelMd.letterSpacing,
    fontFamily: fontFamily.medium,
    fontWeight: typography.labelMd.weight,
  },
  labelSm: {
    fontSize: typography.labelSm.size,
    lineHeight: typography.labelSm.lineHeight,
    letterSpacing: typography.labelSm.letterSpacing,
    fontFamily: fontFamily.semibold,
    fontWeight: typography.labelSm.weight,
  },
};

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  /** Render the text in UPPERCASE with extra letter-spacing. */
  uppercase?: boolean;
  /** Center align convenience. */
  center?: boolean;
}

export function AppText({
  variant = 'bodyMd',
  color,
  style,
  uppercase,
  center,
  children,
  ...rest
}: AppTextProps) {
  return (
    <RNText
      style={[
        styles.base,
        VARIANT_STYLES[variant],
        color ? { color } : null,
        uppercase ? styles.uppercase : null,
        center ? styles.center : null,
        style,
      ]}
      {...rest}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.onSurface,
  },
  uppercase: {
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  center: {
    textAlign: 'center',
  },
});
