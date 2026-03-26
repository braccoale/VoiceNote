import { AuthProvider } from '@/src/context/AuthContext';
import { SubscriptionProvider } from '@/src/context/SubscriptionContext';
import { ToastProvider } from '@/src/context/ToastContext';
import { projectStore } from '@/src/store';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppStack() {
  const colorScheme = useColorScheme();

  return (
    <SubscriptionProvider
      onOpenPaywall={() => router.push('/paywall')}
      onOpenSubscriptionManager={() => router.push('/subscription')}
    >
      <ToastProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
            <Stack.Screen name="subscription" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ToastProvider>
    </SubscriptionProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    projectStore.load();
  }, []);

  return (
    <AuthProvider>
      <AppStack />
    </AuthProvider>
  );
}
