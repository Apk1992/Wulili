import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DialogueEditCard from '@/components/DialogueEditCard';
import TriggerConditionEditor from '@/components/TriggerConditionEditor';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useTheme } from '@/hooks/useTheme';
import {
  CATEGORY_LABELS,
  EMOTION_LABELS,
  type Dialogue,
  type DialogueCategory,
  type EmotionTag,
} from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DialogueEditor'>;

const CATEGORIES: DialogueCategory[] = [
  'greeting',
  'feed',
  'entertain',
  'stream',
  'exercise',
  'medicine',
  'idle',
  'system',
  'shop',
];

const EMOTIONS: EmotionTag[] = [
  'calm',
  'warm',
  'conflicted',
  'selfBlame',
  'fragile',
  'philosophical',
  'playful',
  'longing',
];

export function DialogueEditorScreen({}: Props): React.JSX.Element {
  const { isDark } = useTheme();
  const dialogues = useDialogueStore((s) => s.dialogues);
  const setUserDialogues = useDialogueStore((s) => s.setUserDialogues);

  const [filter, setFilter] = useState<DialogueCategory | 'all'>('all');
  const [editing, setEditing] = useState<Dialogue | null>(null);
  const [showTriggers, setShowTriggers] = useState<Dialogue | null>(null);

  const userDialogues = useMemo(
    () => dialogues.filter((d) => d.source === 'user'),
    [dialogues],
  );

  const visible = useMemo(() => {
    const list =
      filter === 'all'
        ? dialogues
        : dialogues.filter((d) => d.category === filter);
    return list.slice().sort((a, b) => a.id.localeCompare(b.id));
  }, [dialogues, filter]);

  const handleAdd = () => {
    const newDialogue: Dialogue = {
      id: `user-${Date.now()}`,
      text: '',
      category: 'idle',
      emotion: 'calm',
      triggers: [],
      weight: 1,
      cooldownHours: 24,
      once: false,
      source: 'user',
    };
    setEditing(newDialogue);
  };

  const handleSaveEditing = () => {
    if (!editing) return;
    const text = editing.text.trim();
    if (text.length === 0) {
      Alert.alert('内容不能为空', '请输入台词文本。');
      return;
    }

    const nextUser = userDialogues.filter((d) => d.id !== editing.id);
    nextUser.push({ ...editing, text, source: 'user' });
    setUserDialogues(nextUser);
    setEditing(null);
  };

  const handleDelete = (id: string) => {
    const dialogue = dialogues.find((d) => d.id === id);
    if (!dialogue) return;
    if (dialogue.source !== 'user') {
      Alert.alert('无法删除', '内置或线上台词无法在此删除。如需覆盖，请创建同 ID 的本地台词。');
      return;
    }
    Alert.alert('删除台词', '确定要删除这条台词吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          const nextUser = userDialogues.filter((d) => d.id !== id);
          setUserDialogues(nextUser);
        },
      },
    ]);
  };

  const handleChangeInline = (updated: Dialogue) => {
    if (updated.source !== 'user') return;
    const nextUser = userDialogues.map((d) =>
      d.id === updated.id ? updated : d,
    );
    setUserDialogues(nextUser);
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3">
        <Card>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-text dark:text-dark-text">
                台词编辑器
              </Text>
              <Text className="text-[10px] text-muted dark:text-dark-muted mt-0.5">
                共 {dialogues.length} 条 · 本地 {userDialogues.length} 条
              </Text>
            </View>
            <View style={{ width: 100 }}>
              <Button label="新建" size="sm" icon="add" onPress={handleAdd} />
            </View>
          </View>
        </Card>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {(['all', ...CATEGORIES] as const).map((cat) => {
          const active = cat === filter;
          return (
            <Pressable
              key={cat}
              onPress={() => setFilter(cat)}
              className={[
                'px-3 py-1.5 mr-2 rounded-full',
                active
                  ? 'bg-primary'
                  : 'bg-border dark:bg-dark-border',
              ].join(' ')}
            >
              <Text
                className={[
                  'text-xs font-medium',
                  active ? 'text-white' : 'text-muted dark:text-dark-muted',
                ].join(' ')}
              >
                {cat === 'all' ? '全部' : CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <DialogueEditCard
            dialogue={item}
            onChange={handleChangeInline}
            onDelete={handleDelete}
            onEditTriggers={(d) => setShowTriggers(d)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={editing !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditing(null)}
      >
        <View className="flex-1 bg-background dark:bg-dark-bg">
          <View className="px-4 py-3 border-b border-border dark:border-dark-border flex-row items-center justify-between">
            <Pressable onPress={() => setEditing(null)} className="p-2">
              <Text className="text-sm text-primary">取消</Text>
            </Pressable>
            <Text className="text-base font-semibold text-text dark:text-dark-text">
              编辑台词
            </Text>
            <Pressable onPress={handleSaveEditing} className="p-2">
              <Text className="text-sm text-primary font-semibold">保存</Text>
            </Pressable>
          </View>

          {editing ? (
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text className="text-xs text-muted dark:text-dark-muted mb-1">
                台词内容
              </Text>
              <TextInput
                value={editing.text}
                onChangeText={(text) => setEditing({ ...editing, text })}
                multiline
                className={[
                  'text-sm text-text dark:text-dark-text',
                  'bg-card dark:bg-dark-card rounded-xl p-3',
                  'border border-border dark:border-dark-border',
                ].join(' ')}
                style={{ minHeight: 100, textAlignVertical: 'top' }}
                placeholder="写一句雾璃会说的话…"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              />

              <Text className="text-xs text-muted dark:text-dark-muted mt-4 mb-2">
                分类
              </Text>
              <View className="flex-row flex-wrap">
                {CATEGORIES.map((cat) => {
                  const active = editing.category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setEditing({ ...editing, category: cat })}
                      className={[
                        'px-3 py-1.5 mr-2 mb-2 rounded-full',
                        active ? 'bg-primary' : 'bg-border dark:bg-dark-border',
                      ].join(' ')}
                    >
                      <Text
                        className={[
                          'text-xs',
                          active ? 'text-white' : 'text-muted dark:text-dark-muted',
                        ].join(' ')}
                      >
                        {CATEGORY_LABELS[cat]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="text-xs text-muted dark:text-dark-muted mt-2 mb-2">
                情绪
              </Text>
              <View className="flex-row flex-wrap">
                {EMOTIONS.map((em) => {
                  const active = editing.emotion === em;
                  return (
                    <Pressable
                      key={em}
                      onPress={() => setEditing({ ...editing, emotion: em })}
                      className={[
                        'px-3 py-1.5 mr-2 mb-2 rounded-full',
                        active ? 'bg-primary' : 'bg-border dark:bg-dark-border',
                      ].join(' ')}
                    >
                      <Text
                        className={[
                          'text-xs',
                          active ? 'text-white' : 'text-muted dark:text-dark-muted',
                        ].join(' ')}
                      >
                        {EMOTION_LABELS[em]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="text-xs text-muted dark:text-dark-muted mt-2 mb-1">
                权重（越大越容易触发）
              </Text>
              <TextInput
                value={String(editing.weight)}
                onChangeText={(text) => {
                  const n = Number(text);
                  setEditing({
                    ...editing,
                    weight: Number.isFinite(n) ? n : 1,
                  });
                }}
                keyboardType="numeric"
                className={[
                  'text-sm text-text dark:text-dark-text',
                  'bg-card dark:bg-dark-card rounded-xl px-3 py-2',
                  'border border-border dark:border-dark-border',
                ].join(' ')}
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              />

              <Text className="text-xs text-muted dark:text-dark-muted mt-3 mb-1">
                冷却时间（小时）
              </Text>
              <TextInput
                value={String(editing.cooldownHours)}
                onChangeText={(text) => {
                  const n = Number(text);
                  setEditing({
                    ...editing,
                    cooldownHours: Number.isFinite(n) ? n : 24,
                  });
                }}
                keyboardType="numeric"
                className={[
                  'text-sm text-text dark:text-dark-text',
                  'bg-card dark:bg-dark-card rounded-xl px-3 py-2',
                  'border border-border dark:border-dark-border',
                ].join(' ')}
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              />

              <Pressable
                onPress={() =>
                  setEditing({ ...editing, once: !editing.once })
                }
                className="mt-4 flex-row items-center"
              >
                <Ionicons
                  name={editing.once ? 'checkbox' : 'square-outline'}
                  size={20}
                  color="#2563EB"
                />
                <Text className="ml-2 text-sm text-text dark:text-dark-text">
                  只说一次
                </Text>
              </Pressable>

              <Text className="text-xs text-muted dark:text-dark-muted mt-4 mb-2">
                触发条件（{editing.triggers.length}）
              </Text>
              <TriggerConditionEditor
                conditions={editing.triggers}
                onChange={(triggers) => setEditing({ ...editing, triggers })}
              />
            </ScrollView>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={showTriggers !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTriggers(null)}
      >
        <View className="flex-1 bg-background dark:bg-dark-bg">
          <View className="px-4 py-3 border-b border-border dark:border-dark-border flex-row items-center justify-between">
            <Pressable onPress={() => setShowTriggers(null)} className="p-2">
              <Text className="text-sm text-primary">关闭</Text>
            </Pressable>
            <Text className="text-base font-semibold text-text dark:text-dark-text">
              触发条件
            </Text>
            <View style={{ width: 40 }} />
          </View>
          {showTriggers ? (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text className="text-xs text-muted dark:text-dark-muted mb-2">
                台词：{showTriggers.text.slice(0, 60)}
              </Text>
              <TriggerConditionEditor
                conditions={showTriggers.triggers}
                onChange={(triggers) => {
                  setShowTriggers({ ...showTriggers, triggers });
                  const updated = { ...showTriggers, triggers };
                  const nextUser = userDialogues.some((d) => d.id === updated.id)
                    ? userDialogues.map((d) => (d.id === updated.id ? updated : d))
                    : userDialogues;
                  setUserDialogues(nextUser);
                }}
              />
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

export default DialogueEditorScreen;