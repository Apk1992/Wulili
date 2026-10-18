import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';

import WuliliScreen from '@/screens/WuliliScreen';
import MemoryScreen from '@/screens/MemoryScreen';
import { useTheme } from '@/hooks/useTheme';
import type { TabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator(): React.JSX.Element {
  const { isDark } = useTheme();

  const activeColor = '#2563EB';
  const inactiveColor = isDark ? '#64748B' : '#94A3B8';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderTopColor: isDark ? '#334155' : '#E2E8F0',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Wulili"
        component={WuliliScreen}
        options={{
          title: '雾璃', // 🔥 必须加 title
          tabBarLabel: '雾璃',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Memory"
        component={MemoryScreen}
        options={{
          title: '记录', // 🔥 必须加 title
          tabBarLabel: '记录',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'library' : 'library-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

interface BadgeProps {
  count: number;
}

export function TabBadge({ count }: BadgeProps): React.JSX.Element | null {
  if (count <= 0) return null;
  return (
    <View className="min-w-[16px] h-4 px-1 rounded-full bg-danger items-center justify-center">
      <Text className="text-[9px] text-white font-bold">
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export default TabNavigator;
