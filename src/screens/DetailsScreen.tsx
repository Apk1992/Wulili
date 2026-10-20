// src/screens/DetailsScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Details'>;

// 🔥 Cloudflare R2 专属基础公开域名提示
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export default function DetailsScreen({ navigation }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-background p-6">
      <Text className="text-2xl font-bold text-text mb-2">架构详情页面</Text>
      <Text className="text-base text-muted mb-4">
        当前多媒体资产和静态文件已全面托管至 Cloudflare R2 CDN 加速节点。
      </Text>

      <View className="bg-card p-4 rounded-xl mb-8 border border-border">
        <Text className="text-xs text-secondary font-mono">
          CDN Endpoint: {R2_BASE_URL}
        </Text>
      </View>

      <TouchableOpacity
        className="bg-secondary py-4 rounded-2xl items-center"
        onPress={() => navigation.goBack()}
      >
        <Text className="text-white text-base font-semibold">← 返回</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
