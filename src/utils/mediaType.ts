import type { MemoryKind } from '@/types/memory';
import { getExtension } from './format';

const MUSIC_EXTENSIONS = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi', '3gp'];
const NOTE_EXTENSIONS = ['md', 'markdown', 'txt', 'json', 'html'];
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];

export const MUSIC_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
};

export const VIDEO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  '3gp': 'video/3gpp',
};

export const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
};

export function isMusicFile(fileName: string): boolean {
  return MUSIC_EXTENSIONS.includes(getExtension(fileName));
}

export function isVideoFile(fileName: string): boolean {
  return VIDEO_EXTENSIONS.includes(getExtension(fileName));
}

export function isNoteFile(fileName: string): boolean {
  return NOTE_EXTENSIONS.includes(getExtension(fileName));
}

export function isImageFile(fileName: string): boolean {
  return IMAGE_EXTENSIONS.includes(getExtension(fileName));
}

export function detectMemoryKind(fileName: string): MemoryKind | null {
  if (isMusicFile(fileName)) return 'music';
  if (isVideoFile(fileName)) return 'video';
  if (isNoteFile(fileName)) return 'note';
  return null;
}

export function getMusicMime(fileName: string): string {
  return MUSIC_MIME[getExtension(fileName)] ?? 'audio/mpeg';
}

export function getVideoMime(fileName: string): string {
  return VIDEO_MIME[getExtension(fileName)] ?? 'video/mp4';
}

export function getImageMime(fileName: string): string {
  return IMAGE_MIME[getExtension(fileName)] ?? 'image/png';
}

export function getMediaMime(fileName: string): string {
  if (isMusicFile(fileName)) return getMusicMime(fileName);
  if (isVideoFile(fileName)) return getVideoMime(fileName);
  if (isImageFile(fileName)) return getImageMime(fileName);
  return 'application/octet-stream';
}

export function getKindLabel(kind: MemoryKind): string {
  switch (kind) {
    case 'music':
      return '音乐';
    case 'video':
      return '视频';
    case 'note':
      return '笔记';
    default:
      return '未知';
  }
}

export function getKindIcon(kind: MemoryKind): string {
  switch (kind) {
    case 'music':
      return 'musical-notes';
    case 'video':
      return 'videocam';
    case 'note':
      return 'document-text';
    default:
      return 'document';
  }
}