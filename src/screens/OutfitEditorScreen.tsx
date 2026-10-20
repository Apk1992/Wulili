// src/screens/OutfitEditorScreen.tsx
import React from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import ItemEditCard, { type ItemFieldDef } from '@/components/editor/ItemEditCard';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import type { Outfit } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'OutfitEditor'>;

// 🔥 Cloudflare R2 存储桶基础域名
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

const FIELDS: ItemFieldDef[] = [
  { key: 'name', label: '名称', kind: 'text' },
  { key: 'description', label: '描述', kind: 'text' },
  { key: 'price', label: '价格（金币）', kind: 'number' },
  { key: 'moodBonus', label: '心情加成', kind: 'number' },
  { key: 'affinityBonus', label: '亲密度加成', kind: 'number' },
  { key: 'image', label: '图片路径 (R2/相对路径)', kind: 'text' },
];

export function OutfitEditorScreen({}: Props): React.JSX.Element {
  const config = useAppConfigStore((s) => s.config);
  const updateConfig = useAppConfigStore((s) => s.updateConfig);

  const handleChange = (id: string, key: string, value: string) => {
    const next = config.outfits.map((o) => {
      if (o.id !== id) return o;
      if (key === 'price' || key === 'moodBonus' || key === 'affinityBonus') {
        const n = Number(value);
        return { ...o, [key]: Number.isFinite(n) ? n : 0 } as Outfit;
      }
      if (key === 'name') return { ...o, name: value };
      if (key === 'description') return { ...o, description: value };
      if (key === 'image') return { ...o, image: value };
      return o;
    });
    updateConfig({ outfits: next });
  };

  const handleDelete = (id: string) => {
    Alert.alert('删除服装', '确定要删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          updateConfig({ outfits: config.outfits.filter((o) => o.id !== id) });
        },
      },
    ]);
  };

  const handleAdd = () => {
    const newOutfit: Outfit = {
      id: `user-outfit-${Date.now()}`,
      name: '新服装',
      description: '',
      price: 100,
      image: 'images/outfits/default.png', // 🔥 默认分配 R2 相对路径模板
      moodBonus: 5,
      affinityBonus: 2,
    };
    updateConfig({ outfits: [...config.outfits, newOutfit] });
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-text dark:text-dark-text">
          服装编辑器 · {config.outfits.length} 项
        </Text>
        <View style={{ width: 90 }}>
          <Button label="新增" size="sm" icon="add" onPress={handleAdd} />
        </View>
      </View>

      <FlatList
        data={config.outfits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => {
          // 🔥 如果图片路径是相对路径，自动转换为完整的 R2 URL 传给 ItemEditCard 预览
          const displayImage = item.image?.startsWith('http')
            ? item.image
            : `${R2_BASE_URL}/${item.image?.replace(/^\//, '') || ''}`;

          return (
            <ItemEditCard
              title={item.name || '（未命名）'}
              item={{
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                image: displayImage,
                moodBonus: item.moodBonus,
                affinityBonus: item.affinityBonus,
              }}
              fields={FIELDS}
              imageFieldKey="image"
              onChange={(key, value) => handleChange(item.id, key, value)}
              onDelete={() => handleDelete(item.id)}
            />
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

export default OutfitEditorScreen;
