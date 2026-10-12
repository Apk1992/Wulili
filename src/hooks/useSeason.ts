import { useEffect, useState } from 'react';
import { SEASONS, getSeasonFromDate } from '@/data/seasons';
import type { Season } from '@/types/wulili';
import type { SeasonConfig } from '@/data/seasons';

export interface UseSeasonResult {
  season: Season;
  config: SeasonConfig;
  label: string;
  emoji: string;
  description: string;
}

export function useSeason(): UseSeasonResult {
  const [season, setSeason] = useState<Season>(() => getSeasonFromDate());

  useEffect(() => {
    // 每小时检查一次季节（跨天时自动切换）
    const timer = setInterval(() => {
      const next = getSeasonFromDate();
      if (next !== season) {
        setSeason(next);
      }
    }, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [season]);

  const config = SEASONS[season];

  return {
    season,
    config,
    label: config.label,
    emoji: config.emoji,
    description: config.description,
  };
}

export function getSeasonLabel(season: Season): string {
  return SEASONS[season].label;
}

export function getSeasonEmoji(season: Season): string {
  return SEASONS[season].emoji;
}