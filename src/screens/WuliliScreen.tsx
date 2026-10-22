// src/screens/WuliliScreen.tsx
import React, { useCallback, useState } from 'react';
import { Text, View, Pressable, ImageBackground, StatusBar } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { bgmManager } from '@/services/bgmManager';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Wulili'>;

// 🔥 Cloudflare R2 公共加速域名
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  const [isPlayingBgm, setIsPlayingBgm] = useState<boolean>(bgmManager.getIsPlaying());

  // 页面获得焦点时自动启动/恢复 BGM
  useFocusEffect(
    useCallback(() => {
      bgmManager.init();
      setIsPlayingBgm(bgmManager.getIsPlaying());

      return () => {
        // 可选：离开当前主页时的清理逻辑
      };
    }, [])
  );

  // 切换背景音乐开关
  const handleToggleBgm = () => {
    const nextState = bgmManager.toggle();
    setIsPlayingBgm(nextState);
  };

  return (
    <ScreenContainer padded={false} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 背景图（可替换为你在 R2 上的美观壁纸） */}
      <ImageBackground
        source={{ uri: `${R2_BASE_URL}/images/wallpaper_default.jpg` }}
        className="flex-1 justify-between p-6"
        resizeMode="cover"
      >
        {/* 顶部状态栏与快捷按钮区 */}
        <View className="flex-row items-center justify-between pt-4">
          <View className="bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-md">
            <Text className="text-xs text-white font-medium">✨ Wulili Space</Text>
          </View>

          {/* BGM 快捷控制按钮 */}
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

        {/* 中部核心欢迎语与看板卡片 */}
        <View className="my-auto items-center">
          <View className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-lg items-center justify-center mb-4 border border-white/30 shadow-xl">
            <Ionicons name="heart" size={48} color="#F43F5E" />
          </View>
          
          <Text className="text-3xl font-bold text-white text-center mb-2 drop-shadow-md">
            欢迎来到 Wulili
          </Text>
          <Text className="text-sm text-gray-200 text-center px-6 mb-6 drop-shadow">
            所有美好回忆与静态资产已全面接入全球 CDN 加速，随时随地顺畅触达。
          </Text>

          <Card className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-5 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-white">快速导航</Text>
              <Ionicons name="compass-outline" size={18} color="#94A3B8" />
            </View>
            <View className="flex-row justify-between">
              <Pressable
                onPress={() => navigation.navigate('Tabs')}
                className="flex-1 bg-primary/80 py-3 rounded-2xl items-center mr-2 active:opacity-90"
              >
                <Text className="text-xs font-bold text-white">进入回忆录</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('MemoryManager')}
                className="flex-1 bg-white/20 py-3 rounded-2xl items-center ml-2 border border-white/20 active:opacity-90"
              >
                <Text className="text-xs font-bold text-white">资产管理器</Text>
              </Pressable>
            </View>
          </Card>
        </View>

        {/* 底部版权或状态提示 */}
        <View className="items-center pb-2">
          <Text className="text-[10px] text-gray-300 tracking-wider">
            Powered by Cloudflare R2 & React Native
          </Text>
        </View>
      </ImageBackground>
    </ScreenContainer>
  );
}

export default WuliliScreen;
