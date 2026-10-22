// src/screens/WuliliScreen.tsx
import React, { useCallback, useState } from 'react';
import { Text, View, Pressable, ImageBackground, Image, StatusBar, Dimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import { bgmManager } from '@/services/bgmManager';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Wulili'>;

// 🔥 Cloudflare R2 公共加速域名
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

// 定义 6 个 R2 UI 功能按钮
const UI_BUTTONS = [
  { key: 'feed', label: '投喂', iconPath: 'images/ui/btn_feed.png', screen: 'Tabs' },
  { key: 'game', label: '娱乐', iconPath: 'images/ui/btn_game.png', screen: 'Tabs' },
  { key: 'stream', label: '直播', iconPath: 'images/ui/btn_stream.png', screen: 'Tabs' },
  { key: 'exercise', label: '运动', iconPath: 'images/ui/btn_exercise.png', screen: 'Tabs' },
  { key: 'medicine', label: '药房', iconPath: 'images/ui/btn_medicine.png', screen: 'Tabs' },
  { key: 'wardrobe', label: '衣柜', iconPath: 'images/ui/btn_wardrobe.png', screen: 'Tabs' },
];

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  const [isPlayingBgm, setIsPlayingBgm] = useState<boolean>(bgmManager.getIsPlaying());

  useFocusEffect(
    useCallback(() => {
      bgmManager.init();
      setIsPlayingBgm(bgmManager.getIsPlaying());
    }, [])
  );

  const handleToggleBgm = () => {
    const nextState = bgmManager.toggle();
    setIsPlayingBgm(nextState);
  };

  const handleButtonPress = (screenName: string) => {
    // 默认全部导向回忆/主功能区，你也可以根据需要映射到不同 Screen
    navigation.navigate(screenName as any);
  };

  return (
    <ScreenContainer padded={false} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 背景图（直连 R2 加速） */}
      <ImageBackground
        source={{ uri: `${R2_BASE_URL}/images/wallpaper_default.jpg` }}
        className="flex-1 justify-between p-6"
        resizeMode="cover"
      >
        {/* 顶部状态栏与 BGM 切换按钮 */}
        <View className="flex-row items-center justify-between pt-4">
          <View className="bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md">
            <Text className="text-xs text-white font-medium">✨ Wulili Space</Text>
          </View>

          <Pressable
            onPress={handleToggleBgm}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center backdrop-blur-md border border-white/20 active:scale-95"
          >
            <Ionicons
              name={isPlayingBgm ? 'musical-notes' : 'musical-notes-outline'}
              size={20}
              color={isPlayingBgm ? '#60A5FA' : '#FFFFFF'}
            />
          </Pressable>
        </View>

        {/* 中部核心看板标题 */}
        <View className="items-center my-4">
          <View className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-lg items-center justify-center mb-2 border border-white/30 shadow-xl">
            <Ionicons name="heart" size={36} color="#F43F5E" />
          </View>
          <Text className="text-2xl font-bold text-white text-center drop-shadow-md">
            Wulili 互动空间
          </Text>
        </View>

        {/* 底部 R2 UI 图片按钮九宫格/矩阵区 (2行3列) */}
        <View className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-4 mb-4 shadow-2xl">
          <View className="flex-row flex-wrap justify-between">
            {UI_BUTTONS.map((btn) => (
              <Pressable
                key={btn.key}
                onPress={() => handleButtonPress(btn.screen)}
                className="w-[31%] aspect-square mb-3 items-center justify-center bg-white/10 rounded-2xl border border-white/20 active:scale-95 active:bg-white/20"
              >
                {/* 从 R2 加载 UI 按钮图标 */}
                <Image
                  source={{ uri: `${R2_BASE_URL}/${btn.iconPath}` }}
                  className="w-12 h-12 mb-1"
                  resizeMode="contain"
                />
                <Text className="text-[11px] font-bold text-white drop-shadow">
                  {btn.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* 资产管理快捷入口 */}
          <Pressable
            onPress={() => navigation.navigate('MemoryManager')}
            className="mt-1 bg-primary/80 py-2.5 rounded-xl items-center border border-white/20 active:opacity-90"
          >
            <Text className="text-xs font-bold text-white">⚙️ 管理云端资产与文件</Text>
          </Pressable>
        </View>
      </ImageBackground>
    </ScreenContainer>
  );
}

export default WuliliScreen;
