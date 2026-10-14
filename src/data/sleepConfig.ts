export interface SleepConfigData {
  energyRecoveryPerHour: number;
  moodRecoveryPerHour: number;
  healthRecoveryPerHour: number;
  minEnergyToSleep: number;
  autoWakeEnergy: number;
  maxOfflineSeconds: number;
  maxSleepHours: number;

  // 睡眠不足参数
  safeAwakeHours: number;
  tiredAwakeHours: number;
  exhaustedAwakeHours: number;
  criticalAwakeHours: number;
  illnessRiskPerHourTired: number;
  illnessRiskPerHourExhausted: number;
  illnessRiskPerHourCritical: number;
  moodDecayPenaltyTired: number;
  moodDecayPenaltyExhausted: number;
  moodDecayPenaltyCritical: number;
}

export const SLEEP_CONFIG: SleepConfigData = {
  // 每小时恢复
  energyRecoveryPerHour: 15,
  moodRecoveryPerHour: 5 / 8,
  healthRecoveryPerHour: 3 / 8,
  // 睡觉门槛
  minEnergyToSleep: 95,
  // 精力满 100 自动起床
  autoWakeEnergy: 100,
  // 离线最多补 12 小时
  maxOfflineSeconds: 12 * 60 * 60,
  // 单次睡眠最长 12 小时
  maxSleepHours: 12,

  // ========== 睡眠不足 ==========
  // 距上次睡觉 < 16 小时：安全
  safeAwakeHours: 16,
  // 16-24 小时：有点累
  tiredAwakeHours: 24,
  // 24-36 小时：很累
  exhaustedAwakeHours: 36,
  // > 36 小时：极度疲劳
  criticalAwakeHours: 36,

  // 熬夜生病几率（每小时）
  illnessRiskPerHourTired: 0.05,
  illnessRiskPerHourExhausted: 0.15,
  illnessRiskPerHourCritical: 0.3,

  // 熬夜心情衰减加速（额外倍率，1.5 = 衰减速度 ×1.5）
  moodDecayPenaltyTired: 1.3,
  moodDecayPenaltyExhausted: 1.6,
  moodDecayPenaltyCritical: 2.0,
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

export interface SleepDeprivationState {
  level: 'safe' | 'tired' | 'exhausted' | 'critical';
  hoursAwake: number;
  illnessRiskPerHour: number;
  moodDecayMultiplier: number;
  label: string;
}

export function computeSleepDeprivation(
  lastSleptAt: number | null,
  createdAt: number,
): SleepDeprivationState {
  const reference = lastSleptAt ?? createdAt;
  const hoursAwake = Math.max(0, (Date.now() - reference) / (60 * 60 * 1000));

  if (hoursAwake < SLEEP_CONFIG.safeAwakeHours) {
    return {
      level: 'safe',
      hoursAwake,
      illnessRiskPerHour: 0,
      moodDecayMultiplier: 1,
      label: '精神良好',
    };
  }
  if (hoursAwake < SLEEP_CONFIG.tiredAwakeHours) {
    return {
      level: 'tired',
      hoursAwake,
      illnessRiskPerHour: SLEEP_CONFIG.illnessRiskPerHourTired,
      moodDecayMultiplier: SLEEP_CONFIG.moodDecayPenaltyTired,
      label: '有点困',
    };
  }
  if (hoursAwake < SLEEP_CONFIG.exhaustedAwakeHours) {
    return {
      level: 'exhausted',
      hoursAwake,
      illnessRiskPerHour: SLEEP_CONFIG.illnessRiskPerHourExhausted,
      moodDecayMultiplier: SLEEP_CONFIG.moodDecayPenaltyExhausted,
      label: '很疲惫',
    };
  }
  return {
    level: 'critical',
    hoursAwake,
    illnessRiskPerHour: SLEEP_CONFIG.illnessRiskPerHourCritical,
    moodDecayMultiplier: SLEEP_CONFIG.moodDecayPenaltyCritical,
    label: '极度疲劳',
  };
}