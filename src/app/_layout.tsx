// Root layout: providers (gesture root, safe-area, query, theme), font loading, and the
// splash handoff. The splash stays up until both fonts and the persisted theme are ready,
// so the first paint is already on-brand (no light-mode flash).

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useAppFonts } from '@/theme/typography';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if ((fontsLoaded || fontError) && theme.ready) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, theme.ready]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.base } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="conversation/[id]" />
        <Stack.Screen name="community/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="verify/[id]" />
        <Stack.Screen name="channel/[id]" />
        <Stack.Screen name="archived" />
        <Stack.Screen name="new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-group" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-community" options={{ presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recovery-pin" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recovery-phrase" options={{ presentation: 'modal' }} />
        <Stack.Screen name="call/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="media/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="status/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="status/compose" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
