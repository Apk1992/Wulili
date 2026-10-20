// src/screens/MedicineEditorScreen.tsx
import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import ItemEditCard, { type ItemFieldDef } from '@/components/editor/ItemEditCard';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import type { Medicine, IllnessType } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineEditor'>;

// 🔥 Cloudflare R2 专属存储桶域名
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

const FIELDS: ItemFieldDef[] = [
  { key: 'name', label: '名称', kind: 'text' },
  { key: 'description', label: '描述', kind: 'text' },
  { key: 'price', label: '价格（金币）', kind: 'number' },
  { key: 'healthRestore', label: '恢复健康', kind: 'number' },
  { key: 'moodRestore', label: '恢复心情', kind: 'number' },
  { key: 'image', label: '图片路径 (R2/相对路径)', kind: 'text' },
];

const ILLNESS_LIST: IllnessType[] = ['rhinitis', 'cold', 'fever'];

export function MedicineEditorScreen({}: Props): React.JSX.Element {
  const config = useAppConfigStore((s) => s.config);
  const updateConfig = useAppConfigStore((s) => s.updateConfig);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleChange = (id: string, key: string, value: string) => {
    const next = config.medicines.map((m) => {
      if (m.id !== id) return m;
      if (key === 'price' || key === 'healthRestore' || key === 'moodRestore') {
        const n = Number(value);
        return { ...m, [key]: Number.isFinite(n) ? n : 0 } as Medicine;
      }
      if (key === 'name') return { ...m, name: value };
      if (key === 'description') return { ...m, description: value };
      if (key === 'image') return { ...m, image: value };
      return m;
    });
    updateConfig({ medicines: next });
  };

  const toggleCure = (id: string, illness: IllnessType) => {
    const next = config.medicines.map((m) => {
      if (m.id !== id) return m;
      const has = m.cures.includes(illness);
      return {
        ...m,
        cures: has ? m.cures.filter((c) => c !== illness) : [...m.cures, illness],
      };
    });
    updateConfig({ medicines: next });
  };

  const handleDelete = (id: string) => {
    Alert.alert('删除药品', '确定要删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          updateConfig({ medicines: config.medicines.filter((m) => m.id !== id) });
        },
      },
    ]);
  };

  const handleAdd = () => {
    const newMed: Medicine = {
      id: `user-med-${Date.now()}`,
      name: '新药品',
      description: '',
      price: 20,
      image: 'images/medicines/default.png', // 🔥 默认分配 R2 相对路径模板
      cures: [],
      healthRestore: 10,
      moodRestore: 5,
    };
    updateConfig({ medicines: [...config.medicines, newMed] });
    setExpanded(newMed.id);
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-text dark:text-dark-text">
          药品编辑器 · {config.medicines.length} 项
        </Text>
        <View style={{ width: 90 }}>
          <Button label="新增" size="sm" icon="add" onPress={handleAdd} />
        </View>
      </View>

      <FlatList
        data={config.medicines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => {
          // 🔥 自动补全相对路径的预览图为完整的 R2 绝对路径
          const displayImage = item.image?.startsWith('http')
            ? item.image
            : `${R2_BASE_URL}/${item.image?.replace(/^\//, '') || ''}`;

          return (
            <View>
              <ItemEditCard
                title={item.name || '（未命名）'}
                item={{
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  image: displayImage,
                  healthRestore: item.healthRestore,
                  moodRestore: item.moodRestore,
                }}
                fields={FIELDS}
                imageFieldKey="image"
                onChange={(key, value) => handleChange(item.id, key, value)}
                onDelete={() => handleDelete(item.id)}
              />
              <View className="flex-row flex-wrap mb-4 -mt-1">
                {ILLNESS_LIST.map((illness) => {
                  const active = item.cures.includes(illness);
                  return (
                    <Button
                      key={illness}
                      label={illness}
                      size="sm"
                      variant={active ? 'primary' : 'ghost'}
                      fullWidth={false}
                      onPress={() => toggleCure(item.id, illness)}
                    />
                  );
                })}
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

export default MedicineEditorScreen;
