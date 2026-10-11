import type { ActionType, FoodCategory, IllnessType, TimeOfDay } from './wulili';

export type DialogueCategory =
  | 'greeting'
  | 'feed'
  | 'entertain'
  | 'stream'
  | 'exercise'
  | 'medicine'
  | 'idle'
  | 'system'
  | 'shop';

export type EmotionTag =
  | 'calm'
  | 'warm'
  | 'conflicted'
  | 'selfBlame'
  | 'fragile'
  | 'philosophical'
  | 'playful'
  | 'longing';

export type DialogueSource = 'default' | 'remote' | 'user';

export type TriggerType =
  | 'hungerBelow'
  | 'hungerAbove'
  | 'moodBelow'
  | 'moodAbove'
  | 'healthBelow'
  | 'healthAbove'
  | 'energyBelow'
  | 'energyAbove'
  | 'weightBelow'
  | 'weightAbove'
  | 'affinityBelow'
  | 'affinityAbove'
  | 'coinsBelow'
  | 'coinsAbove'
  | 'timeOfDay'
  | 'lastFedHoursAgo'
  | 'lastEntertainedHoursAgo'
  | 'lastStreamedHoursAgo'
  | 'lastExercisedHoursAgo'
  | 'lastInteractionHoursAgo'
  | 'foodCategory'
  | 'illness'
  | 'consecutiveJunkFood'
  | 'consecutiveHealthyFood';

export type TriggerValue = number | string | boolean;

export interface TriggerCondition {
  type: TriggerType;
  value: TriggerValue;
}

export interface Dialogue {
  id: string;
  text: string;
  category: DialogueCategory;
  emotion: EmotionTag;
  action?: ActionType;
  foodCategory?: FoodCategory;
  illness?: IllnessType;
  minAffinity?: number;
  maxAffinity?: number;
  triggers: TriggerCondition[];
  weight: number;
  cooldownHours: number;
  once: boolean;
  source: DialogueSource;
}

export interface DialogueOverride {
  id: string;
  text?: string;
  category?: DialogueCategory;
  emotion?: EmotionTag;
  weight?: number;
  cooldownHours?: number;
  once?: boolean;
  triggers?: TriggerCondition[];
}

export interface DialogueRuntimeState {
  spoken: Record<string, number>;
  onceSpoken: string[];
  lastText: string | null;
}

export interface DialogueSelectionContext {
  action?: ActionType;
  foodCategory?: FoodCategory;
  illness?: IllnessType;
  hunger: number;
  mood: number;
  health: number;
  energy: number;
  weight: number;
  affinity: number;
  coins: number;
  timeOfDay: TimeOfDay;
  lastFedHoursAgo: number | null;
  lastEntertainedHoursAgo: number | null;
  lastStreamedHoursAgo: number | null;
  lastExercisedHoursAgo: number | null;
  lastInteractionHoursAgo: number | null;
  consecutiveJunkFood: number;
  consecutiveHealthyFood: number;
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  hungerBelow: '饱食度低于',
  hungerAbove: '饱食度高于',
  moodBelow: '心情低于',
  moodAbove: '心情高于',
  healthBelow: '健康低于',
  healthAbove: '健康高于',
  energyBelow: '精力低于',
  energyAbove: '精力高于',
  weightBelow: '体重低于',
  weightAbove: '体重高于',
  affinityBelow: '亲密度低于',
  affinityAbove: '亲密度高于',
  coinsBelow: '金币低于',
  coinsAbove: '金币高于',
  timeOfDay: '时段为',
  lastFedHoursAgo: '距上次投喂超过(小时)',
  lastEntertainedHoursAgo: '距上次娱乐超过(小时)',
  lastStreamedHoursAgo: '距上次直播超过(小时)',
  lastExercisedHoursAgo: '距上次运动超过(小时)',
  lastInteractionHoursAgo: '距上次互动超过(小时)',
  foodCategory: '食物类别为',
  illness: '当前病症为',
  consecutiveJunkFood: '连续吃垃圾食品次数≥',
  consecutiveHealthyFood: '连续吃营养餐次数≥',
};

export const EMOTION_LABELS: Record<EmotionTag, string> = {
  calm: '平静',
  warm: '温柔',
  conflicted: '矛盾',
  selfBlame: '自责',
  fragile: '脆弱',
  philosophical: '哲思',
  playful: '俏皮',
  longing: '思念',
};

export const CATEGORY_LABELS: Record<DialogueCategory, string> = {
  greeting: '问候',
  feed: '投喂',
  entertain: '娱乐',
  stream: '直播',
  exercise: '运动',
  medicine: '吃药',
  idle: '独处',
  system: '系统',
  shop: '商店',
};