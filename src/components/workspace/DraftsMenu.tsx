"use client";

import { useEffect, useRef, useState } from "react";
import { useResumeStore } from "@/lib/store";

export function DraftsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const drafts = useResumeStore((s) => s.drafts);
  const activeId = useResumeStore((s) => s.activeId);
  const setActive = useResumeStore((s) => s.setActive);
  const newDraft = useResumeStore((s) => s.newDraft);
  const duplicate = useResumeStore((s) => s.duplicateDraft);
  const remove = useResumeStore((s) => s.deleteDraft);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const list = Object.values(drafts).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Drafts
        <span className="font-mono text-[11px] text-ink-3">{list.length}</span>
      </button>
      {open && (
        <div className="card fade-in absolute right-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-32px)] overflow-hidden p-1.5 shadow-[0_20px_50px_-20px_rgb(27_26_23/0.4)]">
          <ul className="max-h-72 overflow-y-auto scroll-thin">
            {list.map((d) => (
              <li key={d.id} className={`group flex items-center gap-2 rounded-xl px-2 py-1.5 ${d.id === activeId ? "bg-paper-2" : "hover:bg-paper-2/60"}`}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => (setActive(d.id), setOpen(false))}>
                  <span className="block truncate text-sm font-medium">{d.name}</span>
                  <span className="block font-mono text-[11px] text-ink-3">{new Date(d.updatedAt).toLocaleString()}</span>
                </button>
                <button type="button" className="btn btn-ghost btn-icon opacity-0 group-hover:opacity-100" title="Duplicate" onClick={() => duplicate(d.id)}>
                  ⧉
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon opacity-0 hover:text-signal group-hover:opacity-100"
                  title="Delete"
                  onClick={() => {
                    if (confirm(`Delete “${d.name}”? This can't be undone.`)) remove(d.id);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 border-t border-rule pt-1.5">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => (newDraft(false), setOpen(false))}>
              New blank
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => (newDraft(true), setOpen(false))}>
              New from sample
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
