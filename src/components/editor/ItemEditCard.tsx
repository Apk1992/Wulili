import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

export interface ItemFieldDef {
  key: string;
  label: string;
  kind: 'text' | 'number';
  placeholder?: string;
}

export interface ItemEditCardProps {
  title: string;
  item: Record<string, unknown>;
  fields: ItemFieldDef[];
  onChange: (key: string, value: string) => void;
  onDelete: () => void;
  onUploadImage?: () => void;
  imageFieldKey?: string;
  className?: string;
}

export function ItemEditCard({
  title,
  item,
  fields,
  onChange,
  onDelete,
  onUploadImage,
  imageFieldKey = 'image',
  className = '',
}: ItemEditCardProps): React.JSX.Element {
  const { isDark } = useTheme();
  const idValue = typeof item.id === 'string' ? item.id : '';
  const imageValue =
    typeof item[imageFieldKey] === 'string' ? (item[imageFieldKey] as string) : '';

  return (
    <View
      className={[
        'rounded-2xl p-3 mb-3',
        'bg-card dark:bg-dark-card border border-border dark:border-dark-border',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-semibold text-text dark:text-dark-text flex-1" numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          onPress={onDelete}
          className="p-1.5 rounded-full active:opacity-60"
          accessibilityLabel="删除"
        >
          <Ionicons name="trash" size={16} color="#EF4444" />
        </Pressable>
      </View>

      <Text className="text-[10px] text-muted dark:text-dark-muted mb-1">
        ID: {idValue}
      </Text>

      {fields.map((field) => (
        <View key={field.key} className="mb-2">
          <Text className="text-[10px] text-muted dark:text-dark-muted mb-0.5">
            {field.label}
          </Text>
          <TextInput
            value={String(item[field.key] ?? '')}
            onChangeText={(text) => onChange(field.key, text)}
            keyboardType={field.kind === 'number' ? 'numeric' : 'default'}
            placeholder={field.placeholder}
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            className={[
              'text-sm text-text dark:text-dark-text',
              'bg-background dark:bg-dark-bg rounded-lg px-2 py-1',
              'border border-border dark:border-dark-border',
            ].join(' ')}
          />
        </View>
      ))}

      <View className="flex-row items-center mt-1">
        <View className="flex-1 mr-2">
          <Text className="text-[10px] text-muted dark:text-dark-muted mb-0.5">
            图片文件名
          </Text>
          <TextInput
            value={imageValue}
            onChangeText={(text) => onChange(imageFieldKey, text)}
            placeholder="example.png"
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            className={[
              'text-sm text-text dark:text-dark-text',
              'bg-background dark:bg-dark-bg rounded-lg px-2 py-1',
              'border border-border dark:border-dark-border',
            ].join(' ')}
          />
        </View>
        {onUploadImage ? (
          <Pressable
            onPress={onUploadImage}
            className="px-3 py-2 rounded-lg bg-primary active:opacity-80 mt-4"
          >
            <Text className="text-xs text-white font-medium">上传</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default ItemEditCard;