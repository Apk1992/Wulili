export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export function pickOne<T>(items: readonly T[]): T | null {
  if (items.length === 0) return null;
  return items[randomInt(0, items.length - 1)];
}

export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

export interface WeightedItem<T> {
  item: T;
  weight: number;
}

export function weightedPick<T>(entries: readonly WeightedItem<T>[]): T | null {
  const valid = entries.filter((e) => e.weight > 0);
  if (valid.length === 0) return null;
  const total = valid.reduce((sum, e) => sum + e.weight, 0);
  if (total <= 0) return null;
  let threshold = Math.random() * total;
  for (const entry of valid) {
    threshold -= entry.weight;
    if (threshold <= 0) return entry.item;
  }
  return valid[valid.length - 1].item;
}

export function pickMany<T>(items: readonly T[], count: number): T[] {
  return shuffle(items).slice(0, Math.max(0, count));
}

export function chance(probability: number): boolean {
  if (probability <= 0) return false;
  if (probability >= 1) return true;
  return Math.random() < probability;
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}