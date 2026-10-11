import { GITHUB_PATHS } from './githubConfig';
import { getFileJson, putFile, getFileSha } from './githubContents';
import type { Dialogue } from '@/types/dialogue';

export interface RemoteDialogueFile {
  schemaVersion: number;
  updatedAt: string;
  dialogues: Dialogue[];
}

const DEFAULT_SCHEMA_VERSION = 1;

export async function fetchRemoteDialogues(): Promise<{
  file: RemoteDialogueFile;
  sha: string;
}> {
  const result = await getFileJson<RemoteDialogueFile>(GITHUB_PATHS.dialogues);
  const file = normalizeDialogueFile(result.data);
  return { file, sha: result.sha };
}

export async function pushRemoteDialogues(
  dialogues: Dialogue[],
  message: string,
): Promise<{ sha: string; commitUrl: string }> {
  const file: RemoteDialogueFile = {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    dialogues,
  };
  const content = JSON.stringify(file, null, 2);
  const existingSha = await getFileSha(GITHUB_PATHS.dialogues);
  const response = await putFile(
    GITHUB_PATHS.dialogues,
    content,
    message,
    existingSha,
  );
  return {
    sha: response.content.sha,
    commitUrl: response.commit.html_url,
  };
}

function normalizeDialogueFile(input: unknown): RemoteDialogueFile {
  if (typeof input !== 'object' || input === null) {
    return { schemaVersion: DEFAULT_SCHEMA_VERSION, updatedAt: '', dialogues: [] };
  }
  const obj = input as Record<string, unknown>;
  const rawDialogues = Array.isArray(obj.dialogues) ? obj.dialogues : [];
  const dialogues: Dialogue[] = [];
  for (const item of rawDialogues) {
    const normalized = normalizeDialogue(item);
    if (normalized) dialogues.push(normalized);
  }
  return {
    schemaVersion:
      typeof obj.schemaVersion === 'number'
        ? obj.schemaVersion
        : DEFAULT_SCHEMA_VERSION,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : '',
    dialogues,
  };
}

function normalizeDialogue(input: unknown): Dialogue | null {
  if (typeof input !== 'object' || input === null) return null;
  const obj = input as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id : null;
  const text = typeof obj.text === 'string' ? obj.text : null;
  if (!id || !text) return null;

  const triggers = Array.isArray(obj.triggers)
    ? obj.triggers
        .map((t) => normalizeTrigger(t))
        .filter((t): t is NonNullable<typeof t> => t !== null)
    : [];

  return {
    id,
    text,
    category: (obj.category as Dialogue['category']) ?? 'idle',
    emotion: (obj.emotion as Dialogue['emotion']) ?? 'calm',
    action: obj.action as Dialogue['action'],
    foodCategory: obj.foodCategory as Dialogue['foodCategory'],
    illness: obj.illness as Dialogue['illness'],
    minAffinity: typeof obj.minAffinity === 'number' ? obj.minAffinity : undefined,
    maxAffinity: typeof obj.maxAffinity === 'number' ? obj.maxAffinity : undefined,
    triggers,
    weight: typeof obj.weight === 'number' ? obj.weight : 1,
    cooldownHours: typeof obj.cooldownHours === 'number' ? obj.cooldownHours : 12,
    once: obj.once === true,
    source: 'remote',
  };
}

function normalizeTrigger(input: unknown): Dialogue['triggers'][number] | null {
  if (typeof input !== 'object' || input === null) return null;
  const obj = input as Record<string, unknown>;
  const type = typeof obj.type === 'string' ? obj.type : null;
  if (!type) return null;
  const value = obj.value;
  if (
    typeof value !== 'number' &&
    typeof value !== 'string' &&
    typeof value !== 'boolean'
  ) {
    return null;
  }
  return {
    type: type as Dialogue['triggers'][number]['type'],
    value,
  };
}