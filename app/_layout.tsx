import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * STARTUP-FLOW (SecureStore):
 * - Liest *exakt* diese Keys aus SecureStore: 'Loginserver', 'Loginname', 'username', 'password'
 * - Wartet vollständig auf SecureStore (inkl. isAvailableAsync)
 * - Entscheidet Route und ruft router.replace(...)
 * - Versteckt Splash NACH dem Routing
 * - DEV-Logs zur Diagnose
 */

SplashScreen.preventAutoHideAsync().catch(() => {});

const EXACT_KEYS = {
  loginServer: 'Loginserver',
  loginName: 'Loginname',
  username: 'username',
  password: 'password',
} as const;

const ROUTE_RULES: { required: (keyof typeof EXACT_KEYS)[]; path: `/${string}` }[] = [
  { required: ['loginServer', 'loginName', 'username', 'password'], path: '/(tabs)/stundenplan' },
  { required: ['loginServer', 'loginName'], path: '/login' },
  { required: [], path: '/' },
];

function sanitize(v: string | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return null;
  try {
    const parsed = JSON.parse(s);
    if (typeof parsed === 'string') return parsed || null;
  } catch {}
  return s;
}

async function getSecure(key: string) {
  try {
    const v = await SecureStore.getItemAsync(key);
    return sanitize(v);
  } catch (e) {
    if (__DEV__) console.warn('[SecureStore] get failed for', key, e);
    return null;
  }
}

async function readAllFromSecureStoreWithRetry(maxAttempts = 3, delayMs = 150) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const available = await SecureStore.isAvailableAsync();
      if (!available) {
        if (__DEV__) console.warn('[SecureStore] not available on this device');
        // Wenn nicht verfügbar, brechen wir früh ab → alles null
        return { loginServer: null, loginName: null, username: null, password: null } as const;
      }

      const [loginServer, loginName, username, password] = await Promise.all([
        getSecure(EXACT_KEYS.loginServer),
        getSecure(EXACT_KEYS.loginName),
        getSecure(EXACT_KEYS.username),
        getSecure(EXACT_KEYS.password),
      ]);

      const result = { loginServer, loginName, username, password } as const;
      if (__DEV__) console.log(`[SecureStore] attempt ${attempt} →`, result);

      const hasAny = Object.values(result).some(Boolean);
      if (hasAny || attempt === maxAttempts) return result;
    } catch (e) {
      if (__DEV__) console.warn('[SecureStore] read attempt failed', e);
      if (attempt === maxAttempts) throw e;
    }
    await new Promise(res => setTimeout(res, delayMs));
  }
  return { loginServer: null, loginName: null, username: null, password: null } as const;
}

export default function RootLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const hasNavigatedRef = useRef(false);
  const isDark = useColorScheme() === 'dark';
  const tint = isDark ? '#fff' : '#000';
  const bg   = isDark ? '#000' : '#fff';

  useEffect(() => {
    let isActive = true;

    (async () => {
      try {
        const all = await readAllFromSecureStoreWithRetry();
        const has = (k: keyof typeof EXACT_KEYS) => Boolean(all[k]);
        const matched = ROUTE_RULES.find(r => r.required.every(has));
        const target = matched?.path ?? '/';
        if (__DEV__) console.log('[Routing] →', target);

        if (isActive && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          router.replace(target);
        }
      } catch (e) {
        console.warn('Initial routing failed', e);
        if (isActive && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          router.replace('/');
        }
      } finally {
        setTimeout(() => {
          SplashScreen.hideAsync().catch(() => {});
        }, Platform.select({ ios: 120, android: 220, default: 150 }));
      }
    })();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
      screenOptions={{
        headerTintColor: tint,             // macht iOS nicht mehr blau
        headerStyle: { backgroundColor: bg },
      }}
    >
        <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="impressum" options={{ headerShown: true, headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="information-circle-outline" size={22} color={tint} />
              <Text style={{ marginLeft: 6, color: tint, fontSize: 16, fontWeight: '600' }}>
                Impressum
              </Text>
            </View>
          ), headerBackButtonDisplayMode: 'minimal' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
