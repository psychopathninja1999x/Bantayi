import {
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  useFonts,
} from '@expo-google-fonts/lexend';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initDatabase } from '@/src/database';
import { getColors } from '@/src/constants/colors';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const navTheme = (base: typeof DefaultTheme, scheme: 'light' | 'dark') => {
  const colors = getColors(scheme);
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.onSurface,
      border: colors.outlineVariant,
      primary: colors.primary,
    },
  };
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });

  useEffect(() => {
    void initDatabase().catch((err) => {
      console.error('[BanTayi] Database init failed:', err);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    const colors = getColors(colorScheme ?? 'light');
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = getColors(scheme);
  const theme = scheme === 'dark' ? navTheme(DarkTheme, scheme) : navTheme(DefaultTheme, scheme);

  return (
    <ThemeProvider value={theme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
          animation: 'fade',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="pin-setup" />
        <Stack.Screen name="pin-unlock" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="change-pin" />
        <Stack.Screen name="(main)" />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
