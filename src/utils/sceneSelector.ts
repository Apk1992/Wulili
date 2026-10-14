import type { Season, TimeOfDay } from '@/types/wulili';
import { getSeasonFromDate } from '@/data/seasons';

export type SceneKey = 'living' | 'bedroom' | 'kitchen' | 'study';
export type SleepSceneKey = 'bedroom_sleep';

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

export function getSceneImagePath(
  scene: SceneKey,
  season?: Season,
): string {
  const s = season ?? getSeasonFromDate();
  return `images/scenes/${scene}_${s}.png`;
}

export function getSleepSceneImagePath(): string {
  return 'images/scenes/bedroom_sleep.png';
}

export function getFallbackSceneImagePath(scene: SceneKey): string {
  return `images/scenes/${scene}_spring.png`;
}