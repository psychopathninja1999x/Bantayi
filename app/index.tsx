import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, BantayHeroLogo, ScreenBackground } from '@/src/components';
import { colors, spacing } from '@/src/constants/colors';
import { ROUTES } from '@/src/constants/routes';
import { getAppLockEnabled, isPinConfigured } from '@/src/services/pin-lock';
import { isProfileConfigured } from '@/src/services/profile';

export default function Index() {
  const [next, setNext] = useState<Href | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [configured, lockEnabled] = await Promise.all([
          isPinConfigured(),
          getAppLockEnabled(),
        ]);
        if (lockEnabled && !configured) {
          setNext(ROUTES.pinSetup);
          return;
        }
        const profileConfigured = await isProfileConfigured();
        if (!profileConfigured) {
          setNext(ROUTES.profileSetup);
          return;
        }
        setNext(lockEnabled ? ROUTES.pinUnlock : ROUTES.home);
      } catch {
        setNext(ROUTES.pinSetup);
      }
    })();
  }, []);

  if (!next) {
    return (
      <ScreenBackground>
        <View style={styles.boot}>
          <BantayHeroLogo size={140} />
          <AppText variant="headlineLg" color={colors.primary}>
            BanTayi
          </AppText>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenBackground>
    );
  }

  return <Redirect href={next} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
