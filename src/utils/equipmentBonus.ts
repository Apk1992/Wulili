import type {
  Accessory,
  EquipmentBonus,
  Outfit,
} from '@/types/wulili';

export interface AggregatedBonus {
  moodDecayRate: number;
  energyCostRate: number;
  affinityGain: number;
  streamIncomeRate: number;
  moodRecoveryRate: number;
  illnessResistance: number;
}

export const EMPTY_BONUS: AggregatedBonus = {
  moodDecayRate: 1,
  energyCostRate: 1,
  affinityGain: 0,
  streamIncomeRate: 1,
  moodRecoveryRate: 1,
  illnessResistance: 0,
};

function mergeBonus(
  acc: AggregatedBonus,
  bonus: EquipmentBonus | undefined,
): AggregatedBonus {
  if (!bonus) return acc;
  const next: AggregatedBonus = { ...acc };

  if (typeof bonus.moodDecayRate === 'number') {
    next.moodDecayRate = next.moodDecayRate * bonus.moodDecayRate;
  }
  if (typeof bonus.energyCostRate === 'number') {
    next.energyCostRate = next.energyCostRate * bonus.energyCostRate;
  }
  if (typeof bonus.affinityGain === 'number') {
    next.affinityGain = next.affinityGain + bonus.affinityGain;
  }
  if (typeof bonus.streamIncomeRate === 'number') {
    next.streamIncomeRate = next.streamIncomeRate * bonus.streamIncomeRate;
  }
  if (typeof bonus.moodRecoveryRate === 'number') {
    next.moodRecoveryRate = next.moodRecoveryRate * bonus.moodRecoveryRate;
  }
  if (typeof bonus.illnessResistance === 'number') {
    next.illnessResistance = next.illnessResistance + bonus.illnessResistance;
  }

  return next;
}

export function aggregateBonus(
  outfit: Outfit | null,
  accessory: Accessory | null,
): AggregatedBonus {
  let result = { ...EMPTY_BONUS };
  if (outfit) {
    result = mergeBonus(result, outfit.bonus);
    // 兼容老数据：moodBonus / affinityBonus 也计入
    if (outfit.affinityBonus) {
      result.affinityGain += outfit.affinityBonus * 0.1;
    }
  }
  if (accessory) {
    result = mergeBonus(result, accessory.bonus);
    if (accessory.affinityBonus) {
      result.affinityGain += accessory.affinityBonus * 0.1;
    }
  }
  return result;
}

export function describeBonus(bonus: EquipmentBonus): string[] {
  const lines: string[] = [];
  if (typeof bonus.streamIncomeRate === 'number' && bonus.streamIncomeRate !== 1) {
    const pct = Math.round((bonus.streamIncomeRate - 1) * 100);
    lines.push(`直播收入 ${pct > 0 ? '+' : ''}${pct}%`);
  }
  if (typeof bonus.moodDecayRate === 'number' && bonus.moodDecayRate !== 1) {
    const pct = Math.round((1 - bonus.moodDecayRate) * 100);
    lines.push(`心情衰减 ${pct > 0 ? '-' : '+'}${Math.abs(pct)}%`);
  }
  if (typeof bonus.energyCostRate === 'number' && bonus.energyCostRate !== 1) {
    const pct = Math.round((1 - bonus.energyCostRate) * 100);
    lines.push(`精力消耗 ${pct > 0 ? '-' : '+'}${Math.abs(pct)}%`);
  }
  if (typeof bonus.affinityGain === 'number' && bonus.affinityGain !== 0) {
    lines.push(`亲密度获取 +${bonus.affinityGain.toFixed(1)}`);
  }
  if (typeof bonus.moodRecoveryRate === 'number' && bonus.moodRecoveryRate !== 1) {
    const pct = Math.round((bonus.moodRecoveryRate - 1) * 100);
    lines.push(`心情恢复 ${pct > 0 ? '+' : ''}${pct}%`);
  }
  if (typeof bonus.illnessResistance === 'number' && bonus.illnessResistance !== 0) {
    const pct = Math.round(bonus.illnessResistance * 100);
    lines.push(`抗病 +${pct}%`);
  }
  return lines;
}

export function describeAggregated(bonus: AggregatedBonus): string[] {
  const lines: string[] = [];
  if (bonus.streamIncomeRate !== 1) {
    const pct = Math.round((bonus.streamIncomeRate - 1) * 100);
    lines.push(`直播收入 ${pct > 0 ? '+' : ''}${pct}%`);
  }
  if (bonus.moodDecayRate !== 1) {
    const pct = Math.round((1 - bonus.moodDecayRate) * 100);
    lines.push(`心情衰减 ${pct > 0 ? '-' : '+'}${Math.abs(pct)}%`);
  }
  if (bonus.energyCostRate !== 1) {
    const pct = Math.round((1 - bonus.energyCostRate) * 100);
    lines.push(`精力消耗 ${pct > 0 ? '-' : '+'}${Math.abs(pct)}%`);
  }
  if (bonus.affinityGain !== 0) {
    lines.push(`亲密度获取 +${bonus.affinityGain.toFixed(1)}`);
  }
  if (bonus.moodRecoveryRate !== 1) {
    const pct = Math.round((bonus.moodRecoveryRate - 1) * 100);
    lines.push(`心情恢复 ${pct > 0 ? '+' : ''}${pct}%`);
  }
  if (bonus.illnessResistance !== 0) {
    const pct = Math.round(bonus.illnessResistance * 100);
    lines.push(`抗病 +${pct}%`);
  }
  return lines;
}