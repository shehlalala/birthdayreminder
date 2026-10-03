import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { SyncBoot } from '@/data/SyncBoot';
import { useColors } from '@/ui/theme';

export default function RootLayout() {
  const colors = useColors();
  return (
    <>
      <SyncBoot />
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          // On web each page renders its own single <h1>; a navigator
          // header would add a second one.
          headerShown: Platform.OS !== 'web',
          headerTintColor: colors.accent,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
