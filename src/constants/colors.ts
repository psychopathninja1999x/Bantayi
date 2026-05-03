import { Appearance } from 'react-native';

/**
 * BanTayi design tokens — Minimalist-Glassmorphic vault palette.
 *
 * Anchored on Deep Teal (#00342b / #004d40) with Soft Lime Green (#dded49)
 * accents on a Soft Off-White surface. Semantic colors are intentionally
 * desaturated so even urgent UI states stay calm.
 */

const lightColors = {
  background: '#f8faf7',
  surface: '#f8faf7',
  surfaceBright: '#f8faf7',
  surfaceDim: '#d8dbd8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f4f1',
  surfaceContainer: '#eceeec',
  surfaceContainerHigh: '#e7e9e6',
  surfaceContainerHighest: '#e1e3e0',

  primary: '#00342b',
  primaryContainer: '#004d40',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#7ebdac',
  primaryFixed: '#afefdd',
  primaryFixedDim: '#94d3c1',
  onPrimaryFixed: '#00201a',
  onPrimaryFixedVariant: '#065043',

  secondary: '#5b6300',
  secondaryContainer: '#dded49',
  onSecondaryContainer: '#616a00',
  secondaryFixed: '#dded49',
  secondaryFixedDim: '#c1d02c',
  onSecondaryFixed: '#1a1d00',
  onSecondaryFixedVariant: '#444b00',

  tertiary: '#4e2013',
  tertiaryContainer: '#693527',
  tertiaryFixed: '#ffdbd1',
  tertiaryFixedDim: '#ffb5a1',
  onTertiaryFixed: '#370e04',
  onTertiaryFixedVariant: '#6d382a',
  onTertiaryContainer: '#e89f8c',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  outline: '#707975',
  outlineVariant: '#bfc9c4',

  onSurface: '#191c1b',
  onSurfaceVariant: '#3f4945',
  inverseSurface: '#2e3130',
  inverseOnSurface: '#eff1ef',
  inversePrimary: '#94d3c1',

  /** ---- Convenience aliases for legacy code (tab tints, etc.) ---- */
  primaryDark: '#00201a',
  primaryLight: '#94d3c1',
  text: '#191c1b',
  textSecondary: '#3f4945',
  textMuted: '#707975',
  textInverse: '#ffffff',
  border: '#bfc9c4',
  borderSubtle: '#e1e3e0',
  surfaceMuted: '#eceeec',
  accent: '#dded49',
  accentMuted: '#f2f4f1',
  accentGreen: '#94d3c1',
  accentGreenMuted: '#afefdd',
  success: '#065043',
  successMuted: '#afefdd',
  warning: '#6d382a',
  warningMuted: '#ffdbd1',
  danger: '#ba1a1a',
  dangerMuted: '#ffdad6',

  /** Translucent layers for the glassmorphic surfaces. */
  glassFill: 'rgba(255, 255, 255, 0.6)',
  glassFillSoft: 'rgba(255, 255, 255, 0.45)',
  glassFillStrong: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.55)',
  glassBorderSoft: 'rgba(255, 255, 255, 0.3)',
  glassShadow: 'rgba(0, 77, 64, 0.12)',
  glassShadowSoft: 'rgba(0, 77, 64, 0.06)',
  scrimDim: 'rgba(0, 32, 26, 0.45)',
} as const;

type ColorName = keyof typeof lightColors;
export type BanTayiColors = Record<ColorName, string>;

const darkColors: BanTayiColors = {
  background: '#07120f',
  surface: '#07120f',
  surfaceBright: '#16231f',
  surfaceDim: '#050b09',
  surfaceContainerLowest: '#091512',
  surfaceContainerLow: '#0d1b17',
  surfaceContainer: '#12231e',
  surfaceContainerHigh: '#1a2c27',
  surfaceContainerHighest: '#223631',
  primary: '#94d3c1',
  primaryContainer: '#b6eadb',
  onPrimary: '#00201a',
  onPrimaryContainer: '#002b23',
  primaryFixed: '#123f35',
  primaryFixedDim: '#0d332b',
  onPrimaryFixed: '#d4fff3',
  onPrimaryFixedVariant: '#a9e5d3',
  secondary: '#ddea6a',
  secondaryContainer: '#dded49',
  onSecondaryContainer: '#202500',
  secondaryFixed: '#444b00',
  secondaryFixedDim: '#343a00',
  onSecondaryFixed: '#f7ff9e',
  onSecondaryFixedVariant: '#e7f35f',
  tertiary: '#ffb5a1',
  tertiaryContainer: '#ffcfbf',
  tertiaryFixed: '#6d382a',
  tertiaryFixedDim: '#54281d',
  onTertiaryFixed: '#ffede8',
  onTertiaryFixedVariant: '#ffc7b8',
  onTertiaryContainer: '#3b1006',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  outline: '#9aa5a0',
  outlineVariant: '#3f4a45',
  onSurface: '#e4ebe7',
  onSurfaceVariant: '#c0cbc5',
  inverseSurface: '#e4ebe7',
  inverseOnSurface: '#1b201e',
  inversePrimary: '#006b5a',
  primaryDark: '#d4fff3',
  primaryLight: '#94d3c1',
  text: '#e4ebe7',
  textSecondary: '#c0cbc5',
  textMuted: '#9aa5a0',
  textInverse: '#00201a',
  border: '#3f4a45',
  borderSubtle: '#223631',
  surfaceMuted: '#12231e',
  accent: '#dded49',
  accentMuted: '#343a00',
  accentGreen: '#94d3c1',
  accentGreenMuted: '#123f35',
  success: '#a9e5d3',
  successMuted: '#123f35',
  warning: '#ffc7b8',
  warningMuted: '#54281d',
  danger: '#ffb4ab',
  dangerMuted: '#93000a',
  glassFill: 'rgba(18, 35, 30, 0.72)',
  glassFillSoft: 'rgba(18, 35, 30, 0.52)',
  glassFillStrong: 'rgba(27, 47, 41, 0.9)',
  glassBorder: 'rgba(169, 229, 211, 0.16)',
  glassBorderSoft: 'rgba(169, 229, 211, 0.1)',
  glassShadow: 'rgba(0, 0, 0, 0.45)',
  glassShadowSoft: 'rgba(0, 0, 0, 0.24)',
  scrimDim: 'rgba(0, 0, 0, 0.62)',
};

const lightPalette: BanTayiColors = lightColors;

export function getColors(scheme = Appearance.getColorScheme()): BanTayiColors {
  return scheme === 'dark' ? darkColors : lightPalette;
}

export const colors = new Proxy(lightPalette, {
  get(target, prop: keyof BanTayiColors) {
    const palette = getColors();
    return palette[prop] ?? target[prop];
  },
}) as BanTayiColors;

/** Border radii — primary cards 24px, pill for chips, full for buttons. */
export const radii = {
  sm: 4,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 9999,
} as const;

/** 8px-base spacing scale matching the design system. */
export const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Typography scale — Lexend everywhere. Use `family` to pick weights. */
export const typography = {
  display: { size: 40, lineHeight: 48, weight: '600' as const, letterSpacing: -0.8 },
  headlineLg: { size: 28, lineHeight: 36, weight: '500' as const, letterSpacing: -0.3 },
  headlineMd: { size: 22, lineHeight: 30, weight: '500' as const, letterSpacing: 0 },
  bodyLg: { size: 18, lineHeight: 28, weight: '400' as const, letterSpacing: 0 },
  bodyMd: { size: 16, lineHeight: 24, weight: '400' as const, letterSpacing: 0 },
  labelMd: { size: 14, lineHeight: 18, weight: '500' as const, letterSpacing: 0.1 },
  labelSm: { size: 12, lineHeight: 16, weight: '600' as const, letterSpacing: 0.4 },

  /** Legacy plain numbers for screens that still use sizes directly. */
  title: 28,
  subtitle: 18,
  body: 16,
  small: 14,
  caption: 12,
} as const;

export const fontFamily = {
  regular: 'Lexend_400Regular',
  medium: 'Lexend_500Medium',
  semibold: 'Lexend_600SemiBold',
  bold: 'Lexend_700Bold',
} as const;
