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
  // 基础周期 28 天
  baseCycleDays: 28,
  // 延后 0-5 天
  delayMinDays: 0,
  delayMaxDays: 5,
  // 经期 5 天
  periodDays: 5,
  // 排卵期 14-16 天
  ovulationStartDay: 14,
  ovulationEndDay: 16,
  // 布洛芬药效 12 小时
  medicineDurationHours: 12,
  // 药效减轻 70%
  medicineReliefPercent: 0.7,
};

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
  // 未初始化周期 → 立即开始第一天（首次进 App 时）
  if (!state.cycleStartAt) {
    return {
      phase: 'safe',
      dayInCycle: 0,
      daysUntilNextPeriod: MENSTRUAL_CONFIG.baseCycleDays,
      isMedicineActive: false,
      label: '未开始',
      description: '周期尚未开始记录',
    };
  }

  const now = Date.now();
  const cycleMs = state.cycleLengthDays * 24 * 60 * 60 * 1000;
  const elapsedMs = now - state.cycleStartAt;
  const dayInCycle = Math.floor(elapsedMs / (24 * 60 * 60 * 1000)) + 1;
  const daysUntilNextPeriod = Math.max(0, state.cycleLengthDays - dayInCycle);

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

  void cycleMs;
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