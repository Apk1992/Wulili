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
}

export const STREAM_CONFIG: StreamConfigData = {
  // 满状态下一小时赚 60 金币
  baseEarningPerSecond: 60 / 3600,
  // 满精力可支撑约 8 小时（这里 12 是「小时速率」的分子）
  energyCostPerSecond: 12 / 3600,
  // 8 小时心情降约 48
  moodCostPerSecond: 6 / 3600,
  // 精力低于 5 自动结束
  autoStopEnergy: 5,
  // 健康低于 10 自动结束
  autoStopHealth: 10,
  // 离线最多补 8 小时收益
  maxOfflineSeconds: 8 * 60 * 60,
  // 开播门槛
  minEnergyToStart: 10,
  minHealthToStart: 15,
  // 每累计直播 1 小时，等级 +1；等级上限 20
  levelStepSeconds: 60 * 60,
  // 每级 +5% 收入，20 级 +100%
  maxLevelBonus: 1.0,
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
  const progressToNext =
    level >= 20 ? 1 : (totalSeconds % step) / step;
  const bonusRate = Math.min(
    STREAM_CONFIG.maxLevelBonus,
    level * 0.05,
  );
  return { level, progressToNext, bonusRate };
}