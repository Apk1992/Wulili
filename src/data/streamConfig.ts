export interface StreamConfigData {
  baseEarningPerSecond: number;
  energyCostPerSecond: number;
  moodCostPerSecond: number;
  autoStopEnergy: number;
  autoStopHealth: number;
  maxOfflineSeconds: number;
  minEnergyToStart: number;
  minHealthToStart: number;
  levelStepSeconds: number;
  maxLevelBonus: number;
  durationBonusTiers: DurationBonusTier[];
}

export interface DurationBonusTier {
  minHours: number;
  multiplier: number;
  label: string;
}

export const STREAM_CONFIG: StreamConfigData = {
  // 满状态下一小时赚 120 金币（翻倍）
  baseEarningPerSecond: 120 / 3600,
  // 满精力可支撑约 8 小时（12 是「小时速率」分子）
  energyCostPerSecond: 12 / 3600,
  // 8 小时心情降约 48
  moodCostPerSecond: 6 / 3600,
  // 精力低于 5 自动结束
  autoStopEnergy: 5,
  // 健康低于 10 自动结束
  autoStopHealth: 10,
  // 离线最多补 8 小时
  maxOfflineSeconds: 8 * 60 * 60,
  // 开播门槛
  minEnergyToStart: 10,
  minHealthToStart: 15,
  // 每累计直播 1 小时，等级 +1
  levelStepSeconds: 60 * 60,
  // 每级 +5% 收入，20 级 +100%
  maxLevelBonus: 1.0,

  // 本次直播时长 bonus（越播越值钱）
  durationBonusTiers: [
    { minHours: 0, multiplier: 1.0, label: '刚开始' },
    { minHours: 1, multiplier: 1.2, label: '渐入佳境' },
    { minHours: 2, multiplier: 1.5, label: '人气上升' },
    { minHours: 4, multiplier: 1.8, label: '热度爆棚' },
    { minHours: 8, multiplier: 2.0, label: '超长时直播' },
  ],
};

export interface StreamLevelInfo {
  level: number;
  progressToNext: number;
  bonusRate: number;
}

export function computeStreamLevel(totalSeconds: number): StreamLevelInfo {
  const step = STREAM_CONFIG.levelStepSeconds;
  if (totalSeconds <= 0) {
    return { level: 0, progressToNext: 0, bonusRate: 0 };
  }
  const levelRaw = Math.floor(totalSeconds / step);
  const level = Math.min(20, levelRaw);
  const progressToNext = level >= 20 ? 1 : (totalSeconds % step) / step;
  const bonusRate = Math.min(STREAM_CONFIG.maxLevelBonus, level * 0.05);
  return { level, progressToNext, bonusRate };
}

export interface DurationBonusInfo {
  multiplier: number;
  label: string;
  nextTierAt: number | null;
  nextTierMultiplier: number | null;
}

export function computeDurationBonus(currentSessionSeconds: number): DurationBonusInfo {
  const hours = currentSessionSeconds / 3600;
  const tiers = STREAM_CONFIG.durationBonusTiers;

  let current = tiers[0];
  let next: DurationBonusTier | null = null;
  for (let i = 0; i < tiers.length; i += 1) {
    if (hours >= tiers[i].minHours) {
      current = tiers[i];
      next = i + 1 < tiers.length ? tiers[i + 1] : null;
    }
  }

  return {
    multiplier: current.multiplier,
    label: current.label,
    nextTierAt: next ? next.minHours : null,
    nextTierMultiplier: next ? next.multiplier : null,
  };
}