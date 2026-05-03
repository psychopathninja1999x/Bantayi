import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';
import { StyleSheet } from 'react-native';

const LOGO = require('../../assets/images/bantayilogo.png');

export interface BantayLogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function BantayLogo({ size = 72, style }: BantayLogoProps) {
  return (
    <Image
      source={LOGO}
      style={[styles.img, { width: size, height: size }, style]}
      accessibilityRole="image"
      accessibilityLabel="BanTayi logo"
      contentFit="contain"
    />
  );
}

export interface BantayHeroLogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function BantayHeroLogo({ size = 192, style }: BantayHeroLogoProps) {
  return (
    <Image
      source={LOGO}
      style={[styles.img, { width: size, height: size }, style]}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel="BanTayi logo"
    />
  );
}

const styles = StyleSheet.create({
  img: {
    alignSelf: 'center',
  },
});
