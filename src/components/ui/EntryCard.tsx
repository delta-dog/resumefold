"use client";

import { useState, type ReactNode } from "react";

/** Collapsible card for a list entry (a job, a degree, a project). */
export function EntryCard({
  title,
  subtitle,
  defaultOpen = false,
  onRemove,
  onMoveUp,
  onMoveDown,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 py-2 pl-4 pr-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
        >
          <Chevron open={open} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">{title || "Untitled"}</span>
            {subtitle && <span className="block truncate text-xs text-ink-3">{subtitle}</span>}
          </span>
        </button>
        <div className="flex items-center gap-0.5">
          {onMoveUp && (
            <button type="button" className="btn btn-ghost btn-icon" onClick={onMoveUp} aria-label="Move up" title="Move up">
              <Arrow dir="up" />
            </button>
          )}
          {onMoveDown && (
            <button type="button" className="btn btn-ghost btn-icon" onClick={onMoveDown} aria-label="Move down" title="Move down">
              <Arrow dir="down" />
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-icon hover:text-danger" onClick={onRemove} aria-label="Remove" title="Remove">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 4h10M6.5 4V2.8h3V4M4.5 4l.6 9h5.8l.6-9" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="fade-in grid gap-4 px-4 pb-5 pt-1">{children}</div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    >
      <path d="M5 3l4 4-4 4" />
    </svg>
  );
}

function Arrow({ dir }: { dir: "up" | "down" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={dir === "down" ? "rotate-180" : ""}
    >
      <path d="M7 12V2M3 6l4-4 4 4" />
    </svg>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-tile bg-paper-2 text-sm font-medium text-signal transition-colors hover:bg-signal-soft"
    >
      <span className="text-lg leading-none">+</span>
      {children}
    </button>
  );
}
