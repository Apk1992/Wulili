import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import ItemEditCard, { type ItemFieldDef } from '@/components/editor/ItemEditCard';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useTheme } from '@/hooks/useTheme';
import type { Food } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FoodEditor'>;

const FIELDS: ItemFieldDef[] = [
  { key: 'name', label: '名称', kind: 'text' },
  { key: 'description', label: '描述', kind: 'text' },
  { key: 'price', label: '价格（金币）', kind: 'number' },
  { key: 'hunger', label: '饱食变化', kind: 'number' },
  { key: 'mood', label: '心情变化', kind: 'number' },
  { key: 'health', label: '健康变化', kind: 'number' },
  { key: 'energy', label: '精力变化', kind: 'number' },
  { key: 'weight', label: '体重变化', kind: 'number' },
];

export function FoodEditorScreen({}: Props): React.JSX.Element {
  const { isDark } = useTheme();
  const config = useAppConfigStore((s) => s.config);
  const updateConfig = useAppConfigStore((s) => s.updateConfig);
  const [filter, setFilter] = useState<'all' | 'healthy' | 'junk'>('all');

  const foods = useMemo(() => {
    if (filter === 'all') return config.foods;
    return config.foods.filter((f) => f.category === filter);
  }, [config.foods, filter]);

  const handleChange = (id: string, key: string, value: string) => {
    const next = config.foods.map((f) => {
      if (f.id !== id) return f;
      if (key in f.effect) {
        const n = Number(value);
        return {
          ...f,
          effect: { ...f.effect, [key]: Number.isFinite(n) ? n : 0 },
        } as Food;
      }
      if (key === 'price') {
        const n = Number(value);
        return { ...f, price: Number.isFinite(n) ? n : 0 };
      }
      if (key === 'image') return { ...f, image: value };
      if (key === 'name') return { ...f, name: value };
      if (key === 'description') return { ...f, description: value };
      return f;
    });
    updateConfig({ foods: next });
  };

  const handleDelete = (id: string) => {
    Alert.alert('删除食物', '确定要删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          updateConfig({ foods: config.foods.filter((f) => f.id !== id) });
        },
      },
    ]);
  };

  const handleAdd = () => {
    const newFood: Food = {
      id: `user-food-${Date.now()}`,
      name: '新食物',
      description: '',
      category: filter === 'junk' ? 'junk' : 'healthy',
      price: 10,
      image: '',
      effect: { hunger: 10, mood: 0, health: 0, energy: 0, weight: 0 },
    };
    updateConfig({ foods: [...config.foods, newFood] });
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            食物编辑器 · {config.foods.length} 项
          </Text>
          <View style={{ width: 90 }}>
            <Button label="新增" size="sm" icon="add" onPress={handleAdd} />
          </View>
        </View>
        <View className="flex-row mb-3">
          {(['all', 'healthy', 'junk'] as const).map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className={[
                  'px-3 py-1.5 mr-2 rounded-full',
                  active ? 'bg-primary' : 'bg-border dark:bg-dark-border',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-xs',
                    active ? 'text-white' : 'text-muted dark:text-dark-muted',
                  ].join(' ')}
                >
                  {f === 'all' ? '全部' : f === 'healthy' ? '营养' : '放纵'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={foods}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <ItemEditCard
            title={item.name || '（未命名）'}
            item={{
              id: item.id,
              name: item.name,
              description: item.description,
              price: item.price,
              image: item.image,
              hunger: item.effect.hunger,
              mood: item.effect.mood,
              health: item.effect.health,
              energy: item.effect.energy,
              weight: item.effect.weight,
            }}
            fields={FIELDS}
            imageFieldKey="image"
            onChange={(key, value) => handleChange(item.id, key, value)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={false} transparent animationType="none">
        <View />
      </Modal>

      <View className="px-4 pb-3">
        <Text className="text-[10px] text-muted dark:text-dark-muted">
          提示：图片请上传到仓库 {isDark ? '' : ''}images/food/healthy 或 images/food/junk
        </Text>
      </View>
    </ScreenContainer>
  );
}

void Ionicons;
void ScrollView;

export default FoodEditorScreen;