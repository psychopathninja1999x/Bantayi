import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors, spacing } from '@/src/constants/colors';
import { ROUTES } from '@/src/constants/routes';

import { AppText } from './Text';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface NavConfig {
  key: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: Record<string, NavConfig> = {
  home: { key: 'home', label: 'Home', icon: 'home' },
  vault: { key: 'vault', label: 'Vault', icon: 'inventory-2' },
  search: { key: 'search', label: 'Search', icon: 'search' },
  settings: { key: 'settings', label: 'Settings', icon: 'settings' },
};

const ORDER = ['home', 'vault', '__add__', 'search', 'settings'] as const;

export function BottomNavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scheme = useColorScheme();
  const palette = getColors(scheme);
  const isDark = scheme === 'dark';

  const activeName = state.routes[state.index]?.name;

  const onPressTab = (routeName: string) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(routeName as never);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          borderColor: palette.glassBorder,
          shadowColor: palette.glassShadow,
        },
      ]}>
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={isDark ? 35 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.fill,
          { backgroundColor: isDark ? palette.glassFillStrong : palette.glassFill },
        ]}
      />
      <View style={styles.row}>
        {ORDER.map((key) => {
          if (key === '__add__') {
            return (
              <Pressable
                key="__add__"
                accessibilityRole="button"
                accessibilityLabel="Add new item"
                onPress={() => router.push(ROUTES.addItem)}
                style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
                <View
                  style={[
                    styles.fabInner,
                    {
                      backgroundColor: palette.primaryContainer,
                      shadowColor: palette.primaryContainer,
                      borderColor: palette.glassBorder,
                    },
                  ]}>
                  <MaterialIcons name="add" size={28} color={palette.onPrimaryContainer} />
                </View>
              </Pressable>
            );
          }
          const cfg = NAV_ITEMS[key];
          const focused = activeName === key;
          const tint = focused ? palette.primary : palette.onSurfaceVariant;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={cfg.label}
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => onPressTab(key)}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}>
              <MaterialIcons
                name={cfg.icon}
                size={24}
                color={tint}
                style={focused ? styles.iconFocused : undefined}
              />
              <AppText variant="labelSm" color={tint} style={styles.label}>
                {cfg.label.toUpperCase()}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  fill: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 4,
  },
  tabPressed: {
    transform: [{ scale: 0.94 }],
  },
  iconFocused: {
    transform: [{ scale: 1.05 }],
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
  fab: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.lg,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 3,
  },
});
