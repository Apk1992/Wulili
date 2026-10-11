import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import {
  TRIGGER_LABELS,
  type TriggerCondition,
  type TriggerType,
} from '@/types/dialogue';

export interface TriggerConditionEditorProps {
  conditions: TriggerCondition[];
  onChange: (conditions: TriggerCondition[]) => void;
  className?: string;
}

const AVAILABLE_TRIGGERS: TriggerType[] = [
  'hungerBelow',
  'hungerAbove',
  'moodBelow',
  'moodAbove',
  'healthBelow',
  'healthAbove',
  'energyBelow',
  'energyAbove',
  'weightBelow',
  'weightAbove',
  'affinityBelow',
  'affinityAbove',
  'coinsBelow',
  'coinsAbove',
  'timeOfDay',
  'lastFedHoursAgo',
  'lastEntertainedHoursAgo',
  'lastStreamedHoursAgo',
  'lastExercisedHoursAgo',
  'lastInteractionHoursAgo',
  'foodCategory',
  'illness',
  'consecutiveJunkFood',
  'consecutiveHealthyFood',
];

export function TriggerConditionEditor({
  conditions,
  onChange,
  className = '',
}: TriggerConditionEditorProps): React.JSX.Element {
  const { isDark } = useTheme();

  const addCondition = (type: TriggerType) => {
    onChange([...conditions, { type, value: defaultValueFor(type) }]);
  };

  const updateCondition = (index: number, value: string) => {
    const next = conditions.slice();
    const parsed = parseValue(conditions[index].type, value);
    next[index] = { ...next[index], value: parsed };
    onChange(next);
  };

  const removeCondition = (index: number) => {
    const next = conditions.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <View className={className}>
      {conditions.map((condition, index) => (
        <View
          key={`${condition.type}-${index}`}
          className="flex-row items-center mb-2"
        >
          <View className="flex-1 mr-2">
            <Text className="text-[10px] text-muted dark:text-dark-muted mb-0.5">
              {TRIGGER_LABELS[condition.type]}
            </Text>
            <TextInput
              value={String(condition.value)}
              onChangeText={(text) => updateCondition(index, text)}
              className={[
                'text-sm text-text dark:text-dark-text',
                'bg-background dark:bg-dark-bg rounded-lg px-2 py-1',
                'border border-border dark:border-dark-border',
              ].join(' ')}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            />
          </View>
          <Pressable
            onPress={() => removeCondition(index)}
            className="p-2 rounded-full active:opacity-60"
          >
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </Pressable>
        </View>
      ))}

      <View className="mt-2">
        <Text className="text-xs text-muted dark:text-dark-muted mb-2">
          添加条件
        </Text>
        <View className="flex-row flex-wrap">
          {AVAILABLE_TRIGGERS.filter(
            (t) => !conditions.some((c) => c.type === t),
          ).map((type) => (
            <Pressable
              key={type}
              onPress={() => addCondition(type)}
              className="px-2 py-1 mr-2 mb-2 rounded-full bg-primary/10 dark:bg-primary/20 active:opacity-70"
            >
              <Text className="text-[10px] text-primary">
                + {TRIGGER_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function defaultValueFor(type: TriggerType): number | string {
  if (type === 'timeOfDay') return 'night';
  if (type === 'foodCategory') return 'junk';
  if (type === 'illness') return 'rhinitis';
  return 30;
}

function parseValue(type: TriggerType, raw: string): number | string {
  if (type === 'timeOfDay' || type === 'foodCategory' || type === 'illness') {
    return raw;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export default TriggerConditionEditor;