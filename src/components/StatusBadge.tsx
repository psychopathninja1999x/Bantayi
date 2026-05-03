import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, radii, typography } from '@/src/constants/colors';
import type { ItemStatus } from '@/src/types';

/** UI hint for "expiring soon" (not stored as `status` in DB). */
export type StatusBadgeTone = ItemStatus | 'expiring_soon';

const copy: Record<StatusBadgeTone, string> = {
  active: 'Active',
  expired: 'Expired',
  renewed: 'Renewed',
  archived: 'Archived',
  expiring_soon: 'Expiring soon',
};

const stylesByTone: Record<StatusBadgeTone, { bg: string; fg: string }> = {
  active: {
    bg: colors.primaryFixed,
    fg: colors.onPrimaryFixedVariant,
  },
  renewed: {
    bg: colors.secondaryContainer,
    fg: colors.onSecondaryContainer,
  },
  expiring_soon: {
    bg: colors.tertiaryFixed,
    fg: colors.onTertiaryFixedVariant,
  },
  expired: {
    bg: colors.errorContainer,
    fg: colors.onErrorContainer,
  },
  archived: {
    bg: colors.surfaceContainerHigh,
    fg: colors.onSurfaceVariant,
  },
};

export interface StatusBadgeProps {
  tone: StatusBadgeTone;
  /** Optional override label (otherwise uses built-in English strings). */
  label?: string;
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  const s = stylesByTone[tone];
  const text = (label ?? copy[tone]).toUpperCase();
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  text: {
    fontSize: typography.labelSm.size,
    letterSpacing: 0.6,
    fontFamily: fontFamily.semibold,
    fontWeight: '700',
  },
});
