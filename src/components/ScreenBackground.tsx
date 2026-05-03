import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { colors, getColors } from '@/src/constants/colors';

export interface ScreenBackgroundProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Soft Off-White surface with two subtle ambient bloom blobs (Lime in
 * top-left, Teal in bottom-right) — mirrors the radial-gradient body
 * background from the design HTML.
 */
export function ScreenBackground({ children, style }: ScreenBackgroundProps) {
  const scheme = useColorScheme();
  const palette = getColors(scheme);
  const topBloom: [string, string] =
    scheme === 'dark'
      ? ['rgba(148, 211, 193, 0.16)', 'rgba(148, 211, 193, 0)']
      : ['rgba(221, 237, 73, 0.18)', 'rgba(221, 237, 73, 0)'];
  const bottomBloom: [string, string] =
    scheme === 'dark'
      ? ['rgba(221, 237, 73, 0)', 'rgba(221, 237, 73, 0.09)']
      : ['rgba(0, 77, 64, 0)', 'rgba(0, 77, 64, 0.16)'];

  return (
    <View style={[styles.root, { backgroundColor: palette.background }, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={topBloom}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.6 }}
        style={[styles.blob, styles.blobTopLeft]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={bottomBloom}
        start={{ x: 0.3, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={[styles.blob, styles.blobBottomRight]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blob: {
    position: 'absolute',
    width: '100%',
    height: '60%',
  },
  blobTopLeft: {
    top: -120,
    left: -80,
  },
  blobBottomRight: {
    bottom: -160,
    right: -120,
  },
});
