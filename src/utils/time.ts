import type { TimeOfDay } from '@/types/wulili';

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'night';
  return 'lateNight';
}

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: '清晨',
  day: '白天',
  evening: '傍晚',
  night: '夜晚',
  lateNight: '深夜',
};

export function getTimeOfDayLabel(tod: TimeOfDay): string {
  return TIME_OF_DAY_LABELS[tod];
}

export function hoursSince(timestamp: number | null): number | null {
  if (timestamp === null) return null;
  const diff = Date.now() - timestamp;
  if (diff < 0) return 0;
  return diff / HOUR_MS;
}

export function minutesSince(timestamp: number | null): number | null {
  if (timestamp === null) return null;
  const diff = Date.now() - timestamp;
  if (diff < 0) return 0;
  return diff / MINUTE_MS;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatRelativeTime(timestamp: number | null): string {
  if (timestamp === null) return '从未';
  const diff = Date.now() - timestamp;
  if (diff < MINUTE_MS) return '刚刚';
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)} 分钟前`;
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)} 小时前`;
  const days = Math.floor(diff / DAY_MS);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

export function formatHoursAgo(hours: number | null): string {
  if (hours === null) return '从未';
  if (hours < 1) return `${Math.floor(hours * 60)} 分钟前`;
  if (hours < 24) return `${Math.floor(hours)} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export function getDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return getDateKey(a) === getDateKey(b);
}

export function isYesterday(timestamp: number): boolean {
  const now = new Date();
  const yesterday = new Date(now.getTime() - DAY_MS);
  return getDateKey(new Date(timestamp)) === getDateKey(yesterday);
}

export function nowIso(): string {
  return new Date().toISOString();
}