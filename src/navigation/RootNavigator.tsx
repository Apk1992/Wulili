// src/navigation/RootNavigator.tsx
import React from 'react';
import { Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import TabNavigator from './TabNavigator';
import FeedScreen from '@/screens/FeedScreen';
import FoodDetailScreen from '@/screens/FoodDetailScreen';
import EntertainScreen from '@/screens/EntertainScreen';
import AlbumScreen from '@/screens/AlbumScreen';
import HouseScreen from '@/screens/HouseScreen'; 
import StreamScreen from '@/screens/StreamScreen';
import ExerciseScreen from '@/screens/ExerciseScreen';
import MedicineScreen from '@/screens/MedicineScreen';
import MedicineDetailScreen from '@/screens/MedicineDetailScreen';
import ShopScreen from '@/screens/ShopScreen';
import ItemDetailScreen from '@/screens/ItemDetailScreen';
import StatusScreen from '@/screens/StatusScreen';
import MusicPlayerScreen from '@/screens/MusicPlayerScreen';
import VideoPlayerScreen from '@/screens/VideoPlayerScreen';
import NoteReaderScreen from '@/screens/NoteReaderScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import GitHubTokenScreen from '@/screens/GitHubTokenScreen';
import AboutScreen from '@/screens/AboutScreen';
import DeveloperConsoleScreen from '@/screens/DeveloperConsoleScreen';
import DialogueEditorScreen from '@/screens/DialogueEditorScreen';
import FoodEditorScreen from '@/screens/FoodEditorScreen';
import MedicineEditorScreen from '@/screens/MedicineEditorScreen';
import OutfitEditorScreen from '@/screens/OutfitEditorScreen';
import AccessoryEditorScreen from '@/screens/AccessoryEditorScreen';
import MinigameEditorScreen from '@/screens/MinigameEditorScreen';
import MemoryManagerScreen from '@/screens/MemoryManagerScreen';
import { useTheme } from '@/hooks/useTheme';
import type { RootStackParamList } from '@/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  const { isDark } = useTheme();

  const headerBg = isDark ? '#0F172A' : '#F8FAFC';
  const headerText = isDark ? '#F1F5F9' : '#0F172A';
  const iconColor = isDark ? '#F1F5F9' : '#0F172A';

  const defaultScreenOptions = {
    headerStyle: { backgroundColor: headerBg },
    headerTintColor: headerText,
    headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
  };

  return (
    <Stack.Navigator screenOptions={defaultScreenOptions}>
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={({ navigation }) => ({
          headerShown: true,
          title: '雾璃专属',
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              style={{ padding: 8, marginRight: 8 }}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={22} color={iconColor} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="Feed" component={FeedScreen} options={{ title: '投喂' }} />
      <Stack.Screen name="FoodDetail" component={FoodDetailScreen} options={{ title: '食物详情' }} />
      <Stack.Screen name="Entertain" component={EntertainScreen} options={{ title: '娱乐' }} />
      <Stack.Screen name="Album" component={AlbumScreen} options={{ title: '旅行相册' }} />
      <Stack.Screen name="House" component={HouseScreen} options={{ title: '房产中介' }} />
      <Stack.Screen name="Stream" component={StreamScreen} options={{ title: '直播' }} />
      <Stack.Screen name="Exercise" component={ExerciseScreen} options={{ title: '运动' }} />
      <Stack.Screen name="Medicine" component={MedicineScreen} options={{ title: '药房' }} />
      <Stack.Screen name="MedicineDetail" component={MedicineDetailScreen} options={{ title: '药品详情' }} />
      <Stack.Screen name="Shop" component={ShopScreen} options={{ title: '衣柜' }} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: '物品详情' }} />
      <Stack.Screen name="Status" component={StatusScreen} options={{ title: '雾璃的状态' }} />
      <Stack.Screen name="MusicPlayer" component={MusicPlayerScreen} options={{ title: '音乐' }} />
      <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ title: '视频' }} />
      <Stack.Screen name="NoteReader" component={NoteReaderScreen} options={{ title: '读文' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
      <Stack.Screen name="GitHubToken" component={GitHubTokenScreen} options={{ title: 'GitHub Token' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: '关于' }} />
      <Stack.Screen name="DeveloperConsole" component={DeveloperConsoleScreen} options={{ title: '开发者控制台' }} />
      <Stack.Screen name="DialogueEditor" component={DialogueEditorScreen} options={{ title: '台词编辑器' }} />
      <Stack.Screen name="FoodEditor" component={FoodEditorScreen} options={{ title: '食物编辑器' }} />
      <Stack.Screen name="MedicineEditor" component={MedicineEditorScreen} options={{ title: '药品编辑器' }} />
      <Stack.Screen name="OutfitEditor" component={OutfitEditorScreen} options={{ title: '服装编辑器' }} />
      <Stack.Screen name="AccessoryEditor" component={AccessoryEditorScreen} options={{ title: '配饰编辑器' }} />
      <Stack.Screen name="MinigameEditor" component={MinigameEditorScreen} options={{ title: '小游戏编辑器' }} />
      <Stack.Screen name="MemoryManager" component={MemoryManagerScreen} options={{ title: '回忆管理' }} />
    </Stack.Navigator>
  );
}

export default RootNavigator;
