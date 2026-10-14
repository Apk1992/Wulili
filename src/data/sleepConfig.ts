export interface SleepConfigData {
  energyRecoveryPerHour: number;
  moodRecoveryPerHour: number;
  healthRecoveryPerHour: number;
  minEnergyToSleep: number;
  autoWakeEnergy: number;
  maxOfflineSeconds: number;
  maxSleepHours: number;
}

export const SLEEP_CONFIG: SleepConfigData = {
  // 每小时恢复精力 +15
  energyRecoveryPerHour: 15,
  // 每小时恢复心情 +0.625（8 小时 +5）
  moodRecoveryPerHour: 5 / 8,
  // 每小时恢复健康 +0.375（8 小时 +3）
  healthRecoveryPerHour: 3 / 8,
  // 精力低于 95 才能睡
  minEnergyToSleep: 95,
  // 精力达到 100 自动起床
  autoWakeEnergy: 100,
  // 离线最多补 12 小时（睡觉比直播宽松）
  maxOfflineSeconds: 12 * 60 * 60,
  // 单次睡眠最长 12 小时，超过会自动起床
  maxSleepHours: 12,
};

export function canStartSleep(energy: number): boolean {
  return energy < SLEEP_CONFIG.minEnergyToSleep;
}

export function formatSleepDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} 小时 ${m} 分钟`;
  return `${m} 分钟`;
}