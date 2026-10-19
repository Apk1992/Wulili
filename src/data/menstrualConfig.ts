import type { MenstrualPhase, MenstrualState } from '@/types/wulili';

export interface MenstrualConfigData {
  baseCycleDays: number;
  delayMinDays: number;
  delayMaxDays: number;
  periodDays: number;
  medicineDurationHours: number;
  medicineReliefPercent: number;
}

export const MENSTRUAL_CONFIG: MenstrualConfigData = {
  baseCycleDays: 28,
  delayMinDays: 0,
  delayMaxDays: 5,
  periodDays: 5,
  medicineDurationHours: 12,
  medicineReliefPercent: 0.7,
};

// 🔥 固定起始时间 2026-10-19 00:00:00
const FIXED_START_DATE = new Date('2026-10-19T00:00:00').getTime();

export interface MenstrualPhaseInfo {
  phase: MenstrualPhase;
  dayInCycle: number;
  daysUntilNextPeriod: number;
  isMedicineActive: boolean;
  label: string;
  description: string;
}

export function computeMenstrualInfo(
  state: MenstrualState,
): MenstrualPhaseInfo {
  const now = Date.now();
  
  if (now < FIXED_START_DATE) {
    return {
      phase: 'safe',
      dayInCycle: 0,
      daysUntilNextPeriod: MENSTRUAL_CONFIG.baseCycleDays,
      isMedicineActive: false,
      label: '日常',
      description: '身体没什么异样。',
    };
  }

  const elapsedMs = now - FIXED_START_DATE;
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const cycleLength = state.cycleLengthDays || MENSTRUAL_CONFIG.baseCycleDays;
  const dayInCycle = (elapsedDays % cycleLength) + 1;
  const daysUntilNextPeriod = Math.max(0, cycleLength - dayInCycle);

  const isMedicineActive = state.medicineExpireAt !== null && now < state.medicineExpireAt;
  
  // 🔥 核心逻辑：只分“经期”和“经前（非经期）”
  let phase: MenstrualPhase = 'safe';
  let label = '经前';
  let description = '身体没什么异样。';

  if (dayInCycle >= 1 && dayInCycle <= MENSTRUAL_CONFIG.periodDays) {
    phase = 'period';
    label = '经期';
    description = '肚子不太舒服，精神也不太好。';
  } else if (dayInCycle > cycleLength - 3) {
    // 距离下次经期最后 3 天，提示“经前”
    label = '经前';
    description = '快来例假了，可能会有些小情绪。';
  }

  return {
    phase,
    dayInCycle,
    daysUntilNextPeriod,
    isMedicineActive,
    label,
    description,
  };
}

export function randomCycleLength(): number {
  const extra =
    Math.floor(
      Math.random() *
        (MENSTRUAL_CONFIG.delayMaxDays - MENSTRUAL_CONFIG.delayMinDays + 1),
    ) + MENSTRUAL_CONFIG.delayMinDays;
  return MENSTRUAL_CONFIG.baseCycleDays + extra;
}

export function isMedicineActive(state: MenstrualState): boolean {
  if (!state.medicineExpireAt) return false;
  return Date.now() < state.medicineExpireAt;
}

export function getMedicineExpireAt(): number {
  return Date.now() + MENSTRUAL_CONFIG.medicineDurationHours * 60 * 60 * 1000;
}
