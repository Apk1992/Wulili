import { create } from 'zustand';
import type { Dialogue, DialogueRuntimeState } from '@/types/dialogue';
import { STORAGE_KEYS, storageGet, storageSet } from '@/utils/storage';
import { defaultDialogues } from '@/data/defaultDialogues';

const RUNTIME_LIMIT_DAYS = 30;

interface DialogueStore {
  dialogues: Dialogue[];
  spoken: Record<string, number>;
  onceSpoken: string[];
  lastText: string | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  setRemoteDialogues: (remote: Dialogue[]) => void;
  setUserDialogues: (user: Dialogue[]) => void;
  mergeAndSet: (remote: Dialogue[], user: Dialogue[]) => void;
  markSpoken: (id: string) => void;
  setLastText: (text: string | null) => void;
  resetRuntime: () => void;
  getRuntime: () => DialogueRuntimeState;
}

function mergeDialogues(
  base: Dialogue[],
  remote: Dialogue[],
  user: Dialogue[],
): Dialogue[] {
  const map = new Map<string, Dialogue>();
  for (const d of base) map.set(d.id, d);
  for (const d of remote) map.set(d.id, { ...d, source: 'remote' });
  for (const d of user) map.set(d.id, { ...d, source: 'user' });
  return Array.from(map.values());
}

async function persistRuntime(
  spoken: Record<string, number>,
  onceSpoken: string[],
  lastText: string | null,
): Promise<void> {
  const runtime: DialogueRuntimeState = { spoken, onceSpoken, lastText };
  await storageSet(STORAGE_KEYS.dialogueRuntime, runtime);
}

function pruneSpoken(spoken: Record<string, number>): Record<string, number> {
  const cutoff = Date.now() - RUNTIME_LIMIT_DAYS * 24 * 60 * 60 * 1000;
  const next: Record<string, number> = {};
  for (const [id, ts] of Object.entries(spoken)) {
    if (ts >= cutoff) next[id] = ts;
  }
  return next;
}

export const useDialogueStore = create<DialogueStore>((set, get) => ({
  dialogues: defaultDialogues,
  spoken: {},
  onceSpoken: [],
  lastText: null,
  hydrated: false,

  hydrate: async () => {
    const runtime = await storageGet<DialogueRuntimeState>(STORAGE_KEYS.dialogueRuntime);
    const remoteCache = await storageGet<Dialogue[]>(STORAGE_KEYS.dialogueRemoteCache);
    const userPool = await storageGet<Dialogue[]>(STORAGE_KEYS.dialogueUserPool);

    const base = defaultDialogues;
    const remote = Array.isArray(remoteCache) ? remoteCache : [];
    const user = Array.isArray(userPool) ? userPool : [];
    const merged = mergeDialogues(base, remote, user);

    set({
      dialogues: merged,
      spoken: runtime ? pruneSpoken(runtime.spoken ?? {}) : {},
      onceSpoken: runtime?.onceSpoken ?? [],
      lastText: runtime?.lastText ?? null,
      hydrated: true,
    });
  },

  setRemoteDialogues: (remote) => {
    const user = get().dialogues.filter((d) => d.source === 'user');
    const merged = mergeDialogues(defaultDialogues, remote, user);
    set({ dialogues: merged });
    void storageSet(STORAGE_KEYS.dialogueRemoteCache, remote);
  },

  setUserDialogues: (user) => {
    const remote = get().dialogues.filter((d) => d.source === 'remote');
    const merged = mergeDialogues(defaultDialogues, remote, user);
    set({ dialogues: merged });
    void storageSet(STORAGE_KEYS.dialogueUserPool, user);
  },

  mergeAndSet: (remote, user) => {
    const merged = mergeDialogues(defaultDialogues, remote, user);
    set({ dialogues: merged });
    void storageSet(STORAGE_KEYS.dialogueRemoteCache, remote);
    void storageSet(STORAGE_KEYS.dialogueUserPool, user);
  },

  markSpoken: (id) => {
    const now = Date.now();
    const spoken = { ...get().spoken, [id]: now };
    const dialogue = get().dialogues.find((d) => d.id === id);
    const onceSpoken =
      dialogue?.once && !get().onceSpoken.includes(id)
        ? [...get().onceSpoken, id]
        : get().onceSpoken;
    const lastText = dialogue?.text ?? get().lastText;
    set({ spoken, onceSpoken, lastText });
    void persistRuntime(spoken, onceSpoken, lastText);
  },

  setLastText: (text) => {
    set({ lastText: text });
    void persistRuntime(get().spoken, get().onceSpoken, text);
  },

  resetRuntime: () => {
    set({ spoken: {}, onceSpoken: [], lastText: null });
    void persistRuntime({}, [], null);
  },

  getRuntime: () => {
    const { spoken, onceSpoken, lastText } = get();
    return { spoken, onceSpoken, lastText };
  },
}));