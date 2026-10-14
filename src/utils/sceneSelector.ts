import type { Season, TimeOfDay } from '@/types/wulili';
import { getSeasonFromDate } from '@/data/seasons';

export type SceneKey = 'living' | 'bedroom' | 'kitchen' | 'study';

export function getCurrentScene(timeOfDay: TimeOfDay): SceneKey {
  switch (timeOfDay) {
    case 'lateNight':
      return 'bedroom';
    case 'night':
      return Math.random() < 0.5 ? 'bedroom' : 'living';
    case 'morning':
      return Math.random() < 0.4 ? 'kitchen' : 'living';
    case 'evening':
      return Math.random() < 0.3 ? 'kitchen' : 'living';
    case 'day':
    default:
      return 'living';
  }
}

export interface SceneImageResult {
  primary: string;
  fallback: string;
}

export function getSceneImagePath(
  scene: SceneKey,
  season?: Season,
): SceneImageResult {
  const s = season ?? getSeasonFromDate();
  return {
    primary: `images/scenes/${scene}_${s}.png`,
    fallback: `images/scenes/${scene}.png`,
  };
}

export interface SleepSceneResult {
  primary: string;
  fallback: string;
}

export function getSleepSceneImagePath(): SleepSceneResult {
  return {
    primary: 'images/scenes/bedroom_sleep.png',
    fallback: 'images/scenes/bedroom.png',
  };
}

export function getSceneImagePathSingle(
  scene: SceneKey,
  season?: Season,
): string {
  const s = season ?? getSeasonFromDate();
  return `images/scenes/${scene}_${s}.png`;
}