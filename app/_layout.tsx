import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

async function getData(key: string) {
  try {
    const result = await SecureStore.getItemAsync(key);
    console.log(`Daten für ${key} abgerufen:`, result);
    return result ?? null;
  } catch (error) {
    console.error('Fehler beim Abrufen der Daten', error);
    return null;
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    async function checkLogin() {
      const loginname = await getData('Loginname');
      const loginserver = await getData('Loginserver');
      const username = await getData('username');
      const password = await getData('password');

      if (loginname && loginserver && username && password) {
        setInitialRoute('(tabs)'); // alles vorhanden → Tabs direkt
      } else if (loginname && loginserver) {
        setInitialRoute('login'); // nur Server+Name → Loginseite
      } else {
        setInitialRoute('index'); // nichts da → Index
      }
    }

    checkLogin();
  }, []);

  // Fonts oder Routing noch nicht bereit
  if (!loaded || !initialRoute) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName={initialRoute}>
        <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="impressum" options={{ headerShown: true, headerTitle: '' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
