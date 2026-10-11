export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('zh-CN');
}

export function formatStat(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return String(Math.round(value));
}

export function formatWeight(kg: number): string {
  if (!Number.isFinite(kg)) return '0.0 kg';
  return `${kg.toFixed(1)} kg`;
}

export function formatCoins(value: number): string {
  if (!Number.isFinite(value)) return '0 金币';
  return `${formatNumber(value)} 金币`;
}

export function formatPercent(value: number, decimals: number = 0): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const size = bytes / Math.pow(1024, exponent);
  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatDate(timestamp: number | null): string {
  if (timestamp === null || !Number.isFinite(timestamp)) return '—';
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export function formatDelta(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '±0';
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function formatSignedCoins(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0 金币';
  const rounded = Math.round(value);
  return rounded > 0 ? `+${formatNumber(rounded)} 金币` : `${formatNumber(rounded)} 金币`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function stripExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0) return fileName;
  return fileName.slice(0, idx);
}

export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx < 0) return '';
  return fileName.slice(idx + 1).toLowerCase();
}

export function humanizeFileName(fileName: string): string {
  const base = stripExtension(fileName);
  return base.replace(/[_-]+/g, ' ').trim();
}

export function formatLaneIndex(index: number, total: number): string {
  if (!Number.isFinite(index) || !Number.isFinite(total)) return '';
  return `${index + 1}/${total}`;
}

export function formatScore(score: number): string {
  if (!Number.isFinite(score)) return '0';
  return Math.round(score).toString();
}