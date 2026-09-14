"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "nanoid";
import { emptyResume, parseResume, type Resume } from "./schema";
import { sampleResume } from "./sample";

export type Draft = {
  id: string;
  name: string;
  updatedAt: number;
  resume: Resume;
};

export type SaveState = "idle" | "saving" | "saved";

type State = {
  drafts: Record<string, Draft>;
  activeId: string;
  hydrated: boolean;
  saveState: SaveState;
};

type Actions = {
  /** Mutate the active resume in place (immer draft). */
  update: (fn: (r: Resume) => void) => void;
  replace: (resume: Resume) => void;
  newDraft: (fromSample?: boolean) => string;
  importDraft: (resume: Resume, name: string) => string;
  duplicateDraft: (id: string) => string;
  deleteDraft: (id: string) => void;
  renameDraft: (id: string, name: string) => void;
  setActive: (id: string) => void;
  markSaved: () => void;
  setHydrated: () => void;
};

export type ResumeStore = State & Actions;

/** Older drafts used different LaTeX style ids. Map them before validation so nothing is lost. */
const LEGACY_STYLE_IDS: Record<string, string> = { jake: "classic", awesome: "bold", deedy: "columns" };
function migrate(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as { meta?: { latexStyle?: string; latexSourceStyle?: string } };
  if (r.meta) {
    for (const k of ["latexStyle", "latexSourceStyle"] as const) {
      const v = r.meta[k];
      if (v && v in LEGACY_STYLE_IDS) r.meta[k] = LEGACY_STYLE_IDS[v];
    }
  }
  return raw;
}

function makeDraft(resume: Resume, name = "Untitled resume"): Draft {
  return { id: nanoid(10), name, updatedAt: Date.now(), resume };
}

const initialDraft = makeDraft(sampleResume, `${sampleResume.contact.fullName} (sample)`);

export const useResumeStore = create<ResumeStore>()(
  persist(
    immer((set, get) => ({
      drafts: { [initialDraft.id]: initialDraft },
      activeId: initialDraft.id,
      hydrated: false,
      saveState: "idle",

      update: (fn) =>
        set((s) => {
          const d = s.drafts[s.activeId];
          if (!d) return;
          fn(d.resume);
          d.updatedAt = Date.now();
          s.saveState = "saving";
        }),

      replace: (resume) =>
        set((s) => {
          const d = s.drafts[s.activeId];
          if (!d) return;
          d.resume = parseResume(resume);
          d.updatedAt = Date.now();
          s.saveState = "saving";
        }),

      newDraft: (fromSample = false) => {
        const d = makeDraft(fromSample ? structuredClone(sampleResume) : emptyResume());
        set((s) => {
          s.drafts[d.id] = d;
          s.activeId = d.id;
        });
        return d.id;
      },

      importDraft: (resume, name) => {
        const d = makeDraft(parseResume(resume), name);
        set((s) => {
          s.drafts[d.id] = d;
          s.activeId = d.id;
          s.saveState = "saving";
        });
        return d.id;
      },

      duplicateDraft: (id) => {
        const src = get().drafts[id];
        const d = makeDraft(structuredClone(src.resume), `${src.name} (copy)`);
        set((s) => {
          s.drafts[d.id] = d;
          s.activeId = d.id;
        });
        return d.id;
      },

      deleteDraft: (id) =>
        set((s) => {
          delete s.drafts[id];
          const ids = Object.keys(s.drafts);
          if (ids.length === 0) {
            const d = makeDraft(emptyResume());
            s.drafts[d.id] = d;
            s.activeId = d.id;
          } else if (s.activeId === id) {
            s.activeId = ids[0];
          }
        }),

      renameDraft: (id, name) =>
        set((s) => {
          if (s.drafts[id]) s.drafts[id].name = name;
        }),

      setActive: (id) =>
        set((s) => {
          if (s.drafts[id]) s.activeId = id;
        }),

      markSaved: () =>
        set((s) => {
          s.saveState = "saved";
        }),

      setHydrated: () =>
        set((s) => {
          s.hydrated = true;
        }),
    })),
    {
      name: "byr:drafts:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ drafts: s.drafts, activeId: s.activeId }),
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined;
        if (!p?.drafts || Object.keys(p.drafts).length === 0) return current;
        // Re-parse every stored resume so schema additions get defaults.
        const drafts: Record<string, Draft> = {};
        for (const [id, d] of Object.entries(p.drafts)) {
          try {
            drafts[id] = { ...d, resume: parseResume(migrate(d.resume)) };
          } catch {
            /* drop corrupt draft */
          }
        }
        if (!Object.keys(drafts).length) return current;
        const activeId = p.activeId && drafts[p.activeId] ? p.activeId : Object.keys(drafts)[0];
        return { ...current, drafts, activeId };
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

export const useActiveResume = () =>
  useResumeStore((s) => s.drafts[s.activeId]?.resume ?? sampleResume);

export const useActiveDraft = () => useResumeStore((s) => s.drafts[s.activeId]);
