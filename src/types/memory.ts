export type MemoryKind = 'music' | 'video' | 'note';

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  name: string;
  displayName: string;
  path: string;
  size: number;
  sha: string;
  downloadUrl: string | null;
  updatedAt: string | null;
  source: 'repo' | 'release';
  releaseTag?: string;
  assetId?: number;
}

export interface NoteContent {
  path: string;
  sha: string;
  raw: string;
  html: string | null;
  loadedAt: number;
}

export interface MediaSource {
  uri: string;
  headers: Record<string, string>;
  title: string;
  kind: MemoryKind;
}

export type PlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error';

export interface PlaybackState {
  current: MemoryItem | null;
  status: PlaybackStatus;
  position: number;
  duration: number;
  error: string | null;
}