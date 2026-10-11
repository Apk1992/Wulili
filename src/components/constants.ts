import type { IllnessType, Mood, TimeOfDay } from '@/types/wulili';

export const ILLNESS_LABELS: Record<IllnessType, string> = {
  none: '健康',
  rhinitis: '鼻炎',
  cold: '感冒',
  fever: '发烧',
};

export const MOOD_LABELS: Record<Mood, string> = {
  calm: '平静',
  happy: '开心',
  sad: '难过',
  sick: '生病',
  sleepy: '困倦',
  annoyed: '不满',
  shy: '害羞',
};

export const TIME_OF_DAY_LABELS_LOCAL: Record<TimeOfDay, string> = {
  morning: '清晨',
  day: '白天',
  evening: '傍晚',
  night: '夜晚',
  lateNight: '深夜',
};

export const AVATAR_FILES: Record<Mood, string> = {
  calm: 'normal.png',
  happy: 'happy.png',
  sad: 'sad.png',
  sick: 'sick.png',
  sleepy: 'sleepy.png',
  annoyed: 'angry.png',
  shy: 'blush.png',
};