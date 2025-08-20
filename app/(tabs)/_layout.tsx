import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            paddingBottom: 0,
            
          },
          default: {},
        }),
        sceneStyle: Platform.select({
          ios:{
          paddingBottom: 0,
          paddingTop: 0,
          backgroundColor: Colors[colorScheme ?? 'light'].background,
        },
        default:{padding: 0},
      }),
      }}>
      <Tabs.Screen
        name="stundenplan"
        options={{
          title: 'Stundenplan',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="filter"
        options={{
          title: 'Filter',
          tabBarIcon: ({ color }) => <MaterialIcons name="filter-alt" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="benutzer"
        options={{
          title: 'Benutzer',
          tabBarIcon: ({ color }) => <MaterialIcons name="account-circle" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
