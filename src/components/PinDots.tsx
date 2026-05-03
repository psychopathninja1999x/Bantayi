import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/src/constants/colors';

export interface PinDotsProps {
  length: number;
  filled: number;
  /** Optional error pulse — turns red when set. */
  error?: boolean;
}

export function PinDots({ length, filled, error }: PinDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isFilled
                ? error
                  ? styles.dotError
                  : styles.dotFilled
                : styles.dotEmpty,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 999,
  },
  dotEmpty: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  dotFilled: {
    backgroundColor: colors.primary,
    transform: [{ scale: 1.05 }],
    shadowColor: colors.primaryFixed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  dotError: {
    backgroundColor: colors.error,
  },
});
