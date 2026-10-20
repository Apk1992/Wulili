// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// 🔥 Cloudflare R2 专属基础公开域名（可用于任何将来扩展的远程静态封面或横幅资源）
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="p-6">
        <Text className="text-3xl font-bold text-text mb-2">
          Wulili App
        </Text>
        <Text className="text-base text-muted mb-8">
          已全面接入 Cloudflare R2 全球 CDN 加速，畅享零延迟体验。
        </Text>

        <View className="bg-card p-5 rounded-2xl shadow-sm mb-4">
          <Text className="text-lg font-semibold text-text mb-1">
            ✅ R2 架构状态
          </Text>
          <Text className="text-sm text-secondary leading-6">
            媒体加速 · BGM自愈 · 内存同步{'\n'}
            音视频直连 · 全球免阻断
          </Text>
        </View>

        <TouchableOpacity
          className="bg-primary py-4 rounded-2xl items-center"
          onPress={() => navigation.navigate('Details')}
        >
          <Text className="text-white text-base font-semibold">
            进入详情页 →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
