"use client";

import { useSyncExternalStore } from "react";
import type { StateStorage } from "zustand/middleware";

export type StorageIssue = "unavailable" | "full" | "unreadable" | null;

export function resilientStorage(access: () => Pick<Storage, "getItem" | "setItem" | "removeItem">, onIssue: (issue: StorageIssue) => void): StateStorage {
  const memory = new Map<string, string>();
  let fallback = false;
  const fail = (issue: Exclude<StorageIssue, null>) => { fallback = true; onIssue(issue); };
  return {
    getItem(key) {
      if (fallback) return memory.get(key) ?? null;
      try {
        const value = access().getItem(key);
        if (value !== null) {
          try { JSON.parse(value); } catch { fail("unreadable"); return null; }
          memory.set(key, value);
        }
        return value;
      } catch { fail("unavailable"); return memory.get(key) ?? null; }
    },
    setItem(key, value) {
      memory.set(key, value);
      if (fallback) return;
      try { access().setItem(key, value); }
      catch (error) { fail(error instanceof Error && error.name === "QuotaExceededError" ? "full" : "unavailable"); }
    },
    removeItem(key) {
      memory.delete(key);
      if (fallback) return;
      try { access().removeItem(key); } catch { fail("unavailable"); }
    },
  };
}

let issue: StorageIssue = null;
const listeners = new Set<() => void>();
const storage = resilientStorage(() => localStorage, (next) => {
  if (issue === next) return;
  issue = next;
  listeners.forEach((listener) => listener());
});

export function draftStorage() {
  if (typeof window === "undefined" && typeof localStorage === "undefined") throw new Error("Browser storage is not available during server rendering.");
  return storage;
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useStorageIssue() { return useSyncExternalStore(subscribe, () => issue, () => null); }
