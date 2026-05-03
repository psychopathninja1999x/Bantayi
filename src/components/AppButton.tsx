import { MaterialIcons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import type { PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radii, spacing, typography } from '@/src/constants/colors';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'accent'
  | 'destructive';

const MIN_HEIGHT = 56;

const variants: Record<
  AppButtonVariant,
  { container: ViewStyle; label: TextStyle; pressedOpacity: number; spinner: string }
> = {
  primary: {
    container: {
      backgroundColor: colors.primaryContainer,
      shadowColor: colors.primaryContainer,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.32,
      shadowRadius: 18,
      elevation: 6,
    },
    label: { color: colors.onPrimary },
    pressedOpacity: 0.92,
    spinner: colors.onPrimary,
  },
  accent: {
    container: {
      backgroundColor: colors.secondaryContainer,
      shadowColor: colors.secondaryFixedDim,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 5,
    },
    label: { color: colors.onSecondaryContainer },
    pressedOpacity: 0.92,
    spinner: colors.onSecondaryContainer,
  },
  secondary: {
    container: {
      backgroundColor: colors.glassFill,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    label: { color: colors.primary },
    pressedOpacity: 0.92,
    spinner: colors.primary,
  },
  outline: {
    container: {
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
    },
    label: { color: colors.primary },
    pressedOpacity: 0.92,
    spinner: colors.primary,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    label: { color: colors.primary },
    pressedOpacity: 0.7,
    spinner: colors.primary,
  },
  destructive: {
    container: {
      backgroundColor: colors.errorContainer,
    },
    label: { color: colors.onErrorContainer },
    pressedOpacity: 0.9,
    spinner: colors.onErrorContainer,
  },
};

export interface AppButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  children: string;
  variant?: AppButtonVariant;
  loading?: boolean;
  /** Use a smaller pill (40px) instead of the default tall pill (56px). */
  size?: 'lg' | 'md';
  /** Optional leading icon (Material Icons name). */
  icon?: IconName;
  /** Optional trailing icon. */
  trailingIcon?: IconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const AppButton = forwardRef<View, AppButtonProps>(function AppButton(
  {
    children,
    variant = 'primary',
    loading = false,
    size = 'lg',
    icon,
    trailingIcon,
    disabled,
    style,
    textStyle,
    ...rest
  },
  ref,
) {
  const v = variants[variant];
  const isDisabled = disabled || loading;
  const minHeight = size === 'md' ? 44 : MIN_HEIGHT;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        v.container,
        { minHeight },
        isDisabled && styles.disabled,
        pressed && !isDisabled && { opacity: v.pressedOpacity, transform: [{ scale: 0.98 }] },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <View style={styles.row}>
          {icon ? <MaterialIcons name={icon} size={20} color={v.label.color as string} /> : null}
          <Text style={[styles.label, v.label, textStyle]}>{children}</Text>
          {trailingIcon ? (
            <MaterialIcons name={trailingIcon} size={20} color={v.label.color as string} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.bodyMd.size,
    fontFamily: fontFamily.medium,
    fontWeight: '600',
    textAlign: 'center',
  },
});
