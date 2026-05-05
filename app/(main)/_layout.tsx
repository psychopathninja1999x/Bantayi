import { Stack } from 'expo-router';

import { colors } from '@/src/constants/colors';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-item" />
      <Stack.Screen name="backup-restore" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="edit-item/[id]" />
      <Stack.Screen name="item-details/[id]" />
    </Stack>
  );
}
