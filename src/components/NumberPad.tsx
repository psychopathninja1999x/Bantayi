import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/src/constants/colors';

import { AppText } from './Text';

export interface NumberPadProps {
  onPress: (digit: string) => void;
  onBackspace: () => void;
  /** Disable interactions (during submit / lockout). */
  disabled?: boolean;
}

const ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function NumberPad({ onPress, onBackspace, disabled }: NumberPadProps) {
  return (
    <View style={styles.pad}>
      {ROWS.map((row, idx) => (
        <View key={idx} style={styles.row}>
          {row.map((digit) => (
            <PadKey
              key={digit}
              label={digit}
              onPress={() => onPress(digit)}
              disabled={disabled}
            />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        <View style={styles.padPlaceholder} />
        <PadKey label="0" onPress={() => onPress('0')} disabled={disabled} />
        <PadKey
          icon
          onPress={onBackspace}
          disabled={disabled}
          accessibilityLabel="Delete last digit"
        />
      </View>
    </View>
  );
}

interface PadKeyProps {
  label?: string;
  icon?: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

function PadKey({ label, icon, onPress, disabled, accessibilityLabel }: PadKeyProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        icon ? styles.keyGhost : styles.keyGlass,
        pressed && !disabled && styles.keyPressed,
        disabled && styles.keyDisabled,
      ]}>
      {icon ? (
        <MaterialIcons name="backspace" size={26} color={colors.onSurfaceVariant} />
      ) : (
        <AppText variant="headlineMd" color={colors.primary}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const KEY_SIZE = 64;

const styles = StyleSheet.create({
  pad: {
    gap: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyGlass: {
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.glassShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 2,
  },
  keyGhost: {
    backgroundColor: 'transparent',
  },
  keyPressed: {
    backgroundColor: colors.primaryFixed,
    transform: [{ scale: 0.92 }],
  },
  keyDisabled: {
    opacity: 0.4,
  },
  padPlaceholder: {
    width: KEY_SIZE,
    height: KEY_SIZE,
  },
});
