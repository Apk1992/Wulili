import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

export interface JsonEditorProps {
  value: string;
  onCommit: (raw: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

export function JsonEditor({
  value,
  onCommit,
  placeholder = '{\n  "key": "value"\n}',
  minHeight = 200,
  className = '',
}: JsonEditorProps): React.JSX.Element {
  const { isDark } = useTheme();
  const [draft, setDraft] = useState<string>(value);
  const [error, setError] = useState<string | null>(null);

  const tryCommit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setError('内容不能为空');
      return;
    }
    try {
      JSON.parse(trimmed);
      setError(null);
      onCommit(trimmed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '格式错误';
      setError(`JSON 格式错误：${msg}`);
    }
  };

  const formatDraft = () => {
    try {
      const parsed = JSON.parse(draft);
      setDraft(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError('无法格式化，JSON 格式错误');
    }
  };

  return (
    <View className={className}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        multiline
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
        className={[
          'text-xs font-mono text-text dark:text-dark-text',
          'bg-background dark:bg-dark-bg rounded-xl p-3',
          'border border-border dark:border-dark-border',
        ].join(' ')}
        style={{ minHeight, textAlignVertical: 'top' }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error ? (
        <View className="mt-2 flex-row items-center">
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text className="ml-1 text-[11px] text-danger flex-1">{error}</Text>
        </View>
      ) : null}

      <View className="flex-row mt-2">
        <Pressable
          onPress={formatDraft}
          className="flex-1 mr-2 py-2 rounded-lg bg-secondary/10 dark:bg-secondary/20 active:opacity-70"
        >
          <Text className="text-center text-xs font-medium text-secondary">
            格式化
          </Text>
        </Pressable>
        <Pressable
          onPress={tryCommit}
          className="flex-1 py-2 rounded-lg bg-primary active:opacity-80"
        >
          <Text className="text-center text-xs font-medium text-white">
            应用
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default JsonEditor;