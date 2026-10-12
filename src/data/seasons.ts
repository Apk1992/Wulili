import type { Season } from '@/types/wulili';

export interface SeasonConfig {
  id: Season;
  label: string;
  emoji: string;
  description: string;
  months: number[];
  sceneBackground: string;
  moodDecayRate: number;
  energyCostRate: number;
  illnessRiskMultiplier: number;
  preferredFoodCategories: Array<'healthy' | 'junk'>;
  palette: {
    primary: string;
    accent: string;
    background: string;
  };
}

export const SEASONS: Record<Season, SeasonConfig> = {
  spring: {
    id: 'spring',
    label: '春',
    emoji: '🌸',
    description: '万物复苏，花开满地。雾璃喜欢在窗边看樱花。',
    months: [3, 4, 5],
    sceneBackground: 'images/scenes/living_spring.png',
    moodDecayRate: 0.9,
    energyCostRate: 1.0,
    illnessRiskMultiplier: 1.1,
    preferredFoodCategories: ['healthy', 'healthy', 'junk'],
    palette: {
      primary: '#F9A8D4',
      accent: '#BBF7D0',
      background: '#FEF2F2',
    },
  },
  summer: {
    id: 'summer',
    label: '夏',
    emoji: '☀️',
    description: '阳光炽热，蝉鸣阵阵。她开始想吃冰。',
    months: [6, 7, 8],
    sceneBackground: 'images/scenes/living_summer.png',
    moodDecayRate: 1.0,
    energyCostRate: 1.15,
    illnessRiskMultiplier: 0.9,
    preferredFoodCategories: ['junk', 'junk', 'healthy'],
    palette: {
      primary: '#FBBF24',
      accent: '#60A5FA',
      background: '#FEFCE8',
    },
  },
  autumn: {
    id: 'autumn',
    label: '秋',
    emoji: '🍁',
    description: '落叶飘零，天高气爽。她开始想念热汤。',
    months: [9, 10, 11],
    sceneBackground: 'images/scenes/living_autumn.png',
    moodDecayRate: 0.95,
    energyCostRate: 1.0,
    illnessRiskMultiplier: 1.0,
    preferredFoodCategories: ['healthy', 'junk', 'healthy'],
    palette: {
      primary: '#F97316',
      accent: '#FCD34D',
      background: '#FFF7ED',
    },
  },
  winter: {
    id: 'winter',
    label: '冬',
    emoji: '❄️',
    description: '寒风凛冽，她裹紧毯子。很想吃火锅。',
    months: [12, 1, 2],
    sceneBackground: 'images/scenes/living_winter.png',
    moodDecayRate: 1.05,
    energyCostRate: 1.1,
    illnessRiskMultiplier: 1.3,
    preferredFoodCategories: ['junk', 'junk', 'healthy'],
    palette: {
      primary: '#60A5FA',
      accent: '#E0E7FF',
      background: '#F0F9FF',
    },
  },
};

export function getSeasonFromDate(date: Date = new Date()): Season {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function getSeasonConfig(season: Season): SeasonConfig {
  return SEASONS[season];
}

export function getSceneForSeason(
  season: Season,
  baseScene: 'living' | 'bedroom' | 'kitchen' | 'study',
): string {
  return `images/scenes/${baseScene}_${season}.png`;
}