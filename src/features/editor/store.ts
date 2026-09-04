"use client";

import { create } from "zustand";
import type { ResumeDocument, SectionKey } from "@/lib/validation";
import { moveItem as moveInList } from "@/lib/resume-utils";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "offline";
export type ListKey = Exclude<keyof ResumeDocument, "title" | "templateId" | "summary" | "profile" | "settings">;
type DocKey = keyof ResumeDocument;

const DEBOUNCE_MS = 1100;
const MAX_HISTORY = 60;
const backupKey = (id: string) => `rf:backup:${id}`;

type State = {
  resumeId: string | null;
  doc: ResumeDocument | null;
  status: SaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
  dirty: Set<DocKey>;
  past: ResumeDocument[];
  future: ResumeDocument[];
  activeSection: SectionKey | "profile" | "design";
  init: (resumeId: string, doc: ResumeDocument) => void;
  apply: (mutator: (d: ResumeDocument) => ResumeDocument, keys: DocKey[], opts?: { history?: boolean }) => void;
  setActiveSection: (s: State["activeSection"]) => void;
  setList: <K extends ListKey>(key: K, items: ResumeDocument[K]) => void;
  updateItem: <K extends ListKey>(key: K, id: string, patch: Partial<ResumeDocument[K][number]>) => void;
  addItem: <K extends ListKey>(key: K, item: ResumeDocument[K][number]) => void;
  removeItem: (key: ListKey, id: string) => void;
  moveItem: (key: ListKey, from: number, to: number) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
  flush: () => Promise<void>;
};

let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;
let lastHistoryPush = 0;
let retryCount = 0;

export const useEditorStore = create<State>((set, get) => ({
  resumeId: null,
  doc: null,
  status: "idle",
  lastSavedAt: null,
  error: null,
  dirty: new Set(),
  past: [],
  future: [],
  activeSection: "profile",

  init(resumeId, doc) {
    if (timer) clearTimeout(timer);
    timer = null;
    retryCount = 0;
    let restored = doc;
    const dirty = new Set<DocKey>();
    try {
      const raw = localStorage.getItem(backupKey(resumeId));
      if (raw) {
        const backup = JSON.parse(raw) as { doc: ResumeDocument; keys: DocKey[]; at: number };
        if (backup?.doc && Array.isArray(backup.keys) && Date.now() - backup.at < 1000 * 60 * 60 * 24 * 7) {
          restored = { ...doc };
          for (const k of backup.keys) {
             
            (restored as any)[k] = backup.doc[k];
            dirty.add(k);
          }
        }
      }
    } catch {
      /* ignore corrupt backup */
    }
    set({ resumeId, doc: restored, status: dirty.size ? "dirty" : "saved", dirty, past: [], future: [], error: null, lastSavedAt: dirty.size ? null : new Date() });
    if (dirty.size) schedule(get);
  },

  apply(mutator, keys, opts) {
    const { doc, dirty, past } = get();
    if (!doc) return;
    const next = mutator(doc);
    const now = Date.now();
    const pushHistory = opts?.history !== false && now - lastHistoryPush > 600;
    if (pushHistory) lastHistoryPush = now;
    const nd = new Set(dirty);
    keys.forEach((k) => nd.add(k));
    set({
      doc: next,
      dirty: nd,
      status: "dirty",
      past: pushHistory ? [...past.slice(-MAX_HISTORY + 1), doc] : past,
      future: pushHistory ? [] : get().future,
    });
    persistBackup(get);
    schedule(get);
  },

  setActiveSection: (activeSection) => set({ activeSection }),

  setList(key, items) {
    get().apply((d) => ({ ...d, [key]: items }), [key]);
  },
  updateItem(key, id, patch) {
    get().apply((d) => ({ ...d, [key]: (d[key] as { id: string }[]).map((it) => (it.id === id ? { ...it, ...patch } : it)) }), [key]);
  },
  addItem(key, item) {
    get().apply((d) => ({ ...d, [key]: [...(d[key] as unknown[]), item] }), [key]);
  },
  removeItem(key, id) {
    get().apply((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((it) => it.id !== id) }), [key]);
  },
  moveItem(key, from, to) {
    get().apply((d) => ({ ...d, [key]: moveInList(d[key] as unknown[], from, to) }), [key]);
  },

  undo() {
    const { past, doc, future } = get();
    if (!doc || !past.length) return;
    const prev = past[past.length - 1];
    const keys = diffKeys(prev, doc);
    set({ past: past.slice(0, -1), future: [doc, ...future].slice(0, MAX_HISTORY) });
    get().apply(() => prev, keys, { history: false });
  },
  redo() {
    const { future, doc, past } = get();
    if (!doc || !future.length) return;
    const next = future[0];
    const keys = diffKeys(next, doc);
    set({ future: future.slice(1), past: [...past, doc].slice(-MAX_HISTORY) });
    get().apply(() => next, keys, { history: false });
  },

  async save() {
    if (inFlight) return inFlight;
    const { resumeId, doc, dirty } = get();
    if (!resumeId || !doc || dirty.size === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      set({ status: "offline" });
      return;
    }
    const keys = Array.from(dirty);
    const patch: Partial<ResumeDocument> = {};
     
    keys.forEach((k) => ((patch as any)[k] = doc[k]));
    set({ status: "saving", error: null, dirty: new Set() });
    inFlight = (async () => {
      try {
        const res = await fetch(`/api/resumes/${resumeId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? `Save failed (${res.status})`);
        }
        retryCount = 0;
        const stillDirty = get().dirty;
        set({ status: stillDirty.size ? "dirty" : "saved", lastSavedAt: new Date() });
        if (stillDirty.size) schedule(get);
        else localStorage.removeItem(backupKey(resumeId));
      } catch (e) {
        // Re-mark keys as dirty so nothing is lost
        const merged = new Set(get().dirty);
        keys.forEach((k) => merged.add(k));
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        set({ status: offline ? "offline" : "error", dirty: merged, error: offline ? "You are offline. Changes will sync when you reconnect." : (e as Error).message });
        persistBackup(get);
        // exponential backoff retry (max ~30s)
        retryCount = Math.min(retryCount + 1, 5);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => get().save(), Math.min(30000, 2000 * 2 ** retryCount));
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  async flush() {
    if (timer) clearTimeout(timer);
    timer = null;
    await get().save();
  },
}));

function schedule(get: () => State) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void get().save();
  }, DEBOUNCE_MS);
}

function persistBackup(get: () => State) {
  const { resumeId, doc, dirty } = get();
  if (!resumeId || !doc) return;
  try {
    if (dirty.size === 0) localStorage.removeItem(backupKey(resumeId));
    else localStorage.setItem(backupKey(resumeId), JSON.stringify({ doc, keys: Array.from(dirty), at: Date.now() }));
  } catch {
    /* storage full / unavailable */
  }
}

function diffKeys(a: ResumeDocument, b: ResumeDocument): DocKey[] {
  return (Object.keys(a) as DocKey[]).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

// Reconnect handling
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const s = useEditorStore.getState();
    if (s.dirty.size) void s.save();
  });
  window.addEventListener("offline", () => {
    const s = useEditorStore.getState();
    if (s.dirty.size) useEditorStore.setState({ status: "offline" });
  });
  window.addEventListener("beforeunload", (e) => {
    const s = useEditorStore.getState();
    if (s.dirty.size || s.status === "saving") {
      e.preventDefault();
    }
  });
}
