"use client";

import { create } from "zustand";

/** Which resume field the user is editing, so the preview can spotlight it. */
export const useFocusStore = create<{ field: string | null; set: (f: string | null) => void }>((set) => ({
  field: null,
  set: (field) => set({ field }),
}));

/** Transient UI state shared between the wizard and the preview pane. */
export const useUiStore = create<{ lift: boolean; setLift: (v: boolean) => void }>((set) => ({
  lift: false,
  setLift: (lift) => set({ lift }),
}));
