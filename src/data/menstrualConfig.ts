import type { MenstrualPhase, MenstrualState } from '@/types/wulili';

export interface MenstrualConfigData {
  baseCycleDays: number;
  delayMinDays: number;
  delayMaxDays: number;
  periodDays: number;
  ovulationStartDay: number;
  ovulationEndDay: number;
  medicineDurationHours: number;
  medicineReliefPercent: number;
}

export const MENSTRUAL_CONFIG: MenstrualConfigData = {
  baseCycleDays: 28,
  delayMinDays: 0,
  delayMaxDays: 5,
  periodDays: 5,
  ovulationStartDay: 14,
  ovulationEndDay: 16,
  medicineDurationHours: 12,
  medicineReliefPercent: 0.7,
};

// 🔥 新增：固定起始时间 2026-10-19 00:00:00
const FIXED_START_DATE = new Date('2026-10-19T00:00:00').getTime();

export interface MenstrualPhaseInfo {
  phase: MenstrualPhase;
  dayInCycle: number;
  daysUntilNextPeriod: number;
  isMedicineActive: boolean;
  label: string;
  description: string;
}

export function getPhaseForDay(day: number): MenstrualPhase {
  if (day >= 1 && day <= MENSTRUAL_CONFIG.periodDays) return 'period';
  if (
    day >= MENSTRUAL_CONFIG.ovulationStartDay &&
    day <= MENSTRUAL_CONFIG.ovulationEndDay
  ) {
    return 'ovulation';
  }
  if (day < MENSTRUAL_CONFIG.ovulationStartDay) return 'safe';
  return 'luteal';
}

export function computeMenstrualInfo(
  state: MenstrualState,
): MenstrualPhaseInfo {
  const now = Date.now();
  
  // 如果当前时间早于 2026-10-19，就先按未开始算（或者玩家想提前算，也可以改成直接当作第一天）
  if (now < FIXED_START_DATE) {
    return {
      phase: 'safe',
      dayInCycle: 0,
      daysUntilNextPeriod: MENSTRUAL_CONFIG.baseCycleDays,
      isMedicineActive: false,
      label: '未开始',
      description: '周期尚未开始记录',
    };
  }

  // 计算自固定起始日以来过去了多少天
  const elapsedMs = now - FIXED_START_DATE;
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));

  // 计算当前是周期的第几天 (1-28)
  // 如果没有写延后逻辑，可以用 baseCycleDays。如果要延后，可以用 state.cycleLengthDays
  const cycleLength = state.cycleLengthDays || MENSTRUAL_CONFIG.baseCycleDays;
  const dayInCycle = (elapsedDays % cycleLength) + 1;

  const daysUntilNextPeriod = Math.max(0, cycleLength - dayInCycle);

  const phase = getPhaseForDay(dayInCycle);
  const isMedicineActive = state.medicineExpireAt !== null && now < state.medicineExpireAt;

  return {
    phase,
    dayInCycle,
    daysUntilNextPeriod,
    isMedicineActive,
    label: PHASE_LABELS[phase],
    description: PHASE_DESCRIPTIONS[phase],
  };
}

export const PHASE_LABELS: Record<MenstrualPhase, string> = {
  period: '经期',
  safe: '安全期',
  ovulation: '排卵期',
  luteal: '黄体期',
};

export const PHASE_DESCRIPTIONS: Record<MenstrualPhase, string> = {
  period: '肚子不太舒服，精神也不太好。',
  safe: '身体很舒服，状态不错。',
  ovulation: '精力比较充沛。',
  luteal: '有点点小情绪，但还好。',
};

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
