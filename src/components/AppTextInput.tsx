import { MaterialIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fontFamily, radii, spacing, typography } from '@/src/constants/colors';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export interface AppTextInputProps extends TextInputProps {
  label?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional leading icon shown inside the field. */
  leadingIcon?: IconName;
  /** Trailing element rendered after the input value (icon or label). */
  trailing?: React.ReactNode;
  /** Multiline expands to a comfortable text area. */
  multiline?: boolean;
}

export function AppTextInput({
  label,
  hint,
  containerStyle,
  style,
  multiline = false,
  editable = true,
  leadingIcon,
  trailing,
  onSubmitEditing,
  returnKeyType,
  blurOnSubmit,
  ...rest
}: AppTextInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text style={[styles.label, !editable && styles.labelMuted]}>{label}</Text>
      ) : null}
      <Pressable
        disabled={!editable}
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.fieldRow,
          multiline && styles.fieldRowMultiline,
          focused && styles.fieldRowFocused,
          !editable && styles.fieldRowDisabled,
        ]}>
        {leadingIcon ? (
          <MaterialIcons
            name={leadingIcon}
            size={20}
            color={focused ? colors.primary : colors.onSurfaceVariant}
            style={styles.leadingIcon}
          />
        ) : null}
        <TextInput
          ref={inputRef}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={colors.outline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType={returnKeyType ?? (multiline ? 'default' : 'done')}
          blurOnSubmit={blurOnSubmit ?? !multiline}
          onSubmitEditing={(event) => {
            onSubmitEditing?.(event);
          }}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            !editable && styles.inputDisabled,
            style,
          ]}
          {...rest}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: typography.labelSm.size,
    letterSpacing: typography.labelSm.letterSpacing,
    fontFamily: fontFamily.semibold,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  labelMuted: {
    opacity: 0.6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.glassFill,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  fieldRowMultiline: {
    alignItems: 'flex-start',
    minHeight: 120,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  fieldRowFocused: {
    borderColor: colors.primaryContainer,
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldRowDisabled: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
  },
  leadingIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.bodyMd.size,
    lineHeight: Platform.OS === 'ios' ? undefined : typography.bodyMd.lineHeight,
    fontFamily: fontFamily.regular,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    color: colors.onSurfaceVariant,
  },
  trailing: {
    marginLeft: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hint: {
    fontSize: typography.labelSm.size,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    paddingHorizontal: 4,
    fontFamily: fontFamily.regular,
  },
});
