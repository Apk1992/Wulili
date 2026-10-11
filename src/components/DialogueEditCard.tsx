import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import {
  CATEGORY_LABELS,
  EMOTION_LABELS,
  type Dialogue,
} from '@/types/dialogue';

export interface DialogueEditCardProps {
  dialogue: Dialogue;
  onChange: (updated: Dialogue) => void;
  onDelete: (id: string) => void;
  onEditTriggers: (dialogue: Dialogue) => void;
  className?: string;
}

export function DialogueEditCard({
  dialogue,
  onChange,
  onDelete,
  onEditTriggers,
  className = '',
}: DialogueEditCardProps): React.JSX.Element {
  const { isDark } = useTheme();

  const sourceBadge = sourceToBadge(dialogue.source);

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
        <View className="flex-row items-center">
          <View
            className="px-2 py-0.5 rounded-md mr-2"
            style={{ backgroundColor: sourceBadge.bg }}
          >
            <Text className="text-[10px] font-medium" style={{ color: sourceBadge.text }}>
              {sourceBadge.label}
            </Text>
          </View>
          <Text className="text-[10px] text-muted dark:text-dark-muted">
            {CATEGORY_LABELS[dialogue.category]} · {EMOTION_LABELS[dialogue.emotion]}
          </Text>
        </View>
        <View className="flex-row">
          <Pressable
            onPress={() => onEditTriggers(dialogue)}
            className="p-1.5 mr-1 rounded-full active:opacity-60"
            accessibilityLabel="编辑触发条件"
          >
            <Ionicons name="options" size={16} color={isDark ? '#F1F5F9' : '#0F172A'} />
          </Pressable>
          <Pressable
            onPress={() => onDelete(dialogue.id)}
            className="p-1.5 rounded-full active:opacity-60"
            accessibilityLabel="删除"
          >
            <Ionicons name="trash" size={16} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      <TextInput
        value={dialogue.text}
        onChangeText={(text) => onChange({ ...dialogue, text })}
        multiline
        className={[
          'text-sm text-text dark:text-dark-text',
          'bg-background dark:bg-dark-bg rounded-xl p-2',
          'border border-border dark:border-dark-border',
        ].join(' ')}
        placeholder="台词内容"
        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
      />

      <View className="flex-row items-center mt-2">
        <Text className="text-[10px] text-muted dark:text-dark-muted mr-3">
          ID: {dialogue.id}
        </Text>
        <Text className="text-[10px] text-muted dark:text-dark-muted">
          条件数: {dialogue.triggers.length}
        </Text>
      </View>
    </View>
  );
}

function sourceToBadge(source: Dialogue['source']): {
  label: string;
  bg: string;
  text: string;
} {
  switch (source) {
    case 'remote':
      return { label: '线上', bg: '#DBEAFE', text: '#1E40AF' };
    case 'user':
      return { label: '本地', bg: '#DCFCE7', text: '#166534' };
    case 'default':
    default:
      return { label: '内置', bg: '#E2E8F0', text: '#334155' };
  }
}

export default DialogueEditCard;