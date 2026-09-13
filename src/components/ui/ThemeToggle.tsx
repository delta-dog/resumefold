"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { THEME_KEY as KEY, type ThemePref } from "@/lib/theme";

function apply(pref: ThemePref) {
  const el = document.documentElement;
  if (pref === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", pref);
}

/* A tiny external store over localStorage so the toggle needs no effect. */
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readPref(): ThemePref {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function subscribeSystemTheme(cb: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", cb);
  return () => query.removeEventListener("change", cb);
}

function readSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  // Server snapshot is always "system", so there is no hydration mismatch.
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);
  const systemDark = useSyncExternalStore(subscribeSystemTheme, readSystemDark, () => false);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const mobile = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !mobile.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 640px)");
    const onResize = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  const choose = (p: ThemePref) => {
    apply(p);
    try {
      if (p === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  };

  const opts: { v: ThemePref; label: string; icon: React.ReactNode }[] = [
    { v: "light", label: "Light", icon: <Sun /> },
    { v: "system", label: "System", icon: <Auto /> },
    { v: "dark", label: "Dark", icon: <Moon /> },
  ];
  const mobileOpts = opts.filter((option) => option.v !== "system");
  const mobilePref = pref === "system" ? (systemDark ? "dark" : "light") : pref;
  const selected = mobileOpts.find((option) => option.v === mobilePref)!;

  return (
    <>
      <div ref={mobile} className="relative sm:hidden" onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
        <button ref={trigger} type="button" aria-label={`Appearance: ${selected.label}`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-pill bg-paper-3 text-ink">
          {selected.icon}
        </button>
        <div id={panelId} hidden={!open} className="absolute right-0 top-full z-50 mt-2 w-40 rounded-2xl border border-rule bg-paper p-2 shadow-[var(--shadow-pop)]">
          <p className="px-3 py-2 text-xs font-medium text-ink-2">Appearance</p>
          <div role="group" aria-label="Theme">
            {mobileOpts.map((option) => (
              <button key={option.v} type="button" aria-pressed={mobilePref === option.v} onClick={() => { choose(option.v); setOpen(false); trigger.current?.focus(); }} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm ${mobilePref === option.v ? "bg-signal-soft text-signal" : "text-ink hover:bg-paper-3"}`}>
                {option.icon}<span>{option.label}</span>
                {mobilePref === option.v && <span aria-hidden className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="hidden rounded-pill bg-paper-3 p-1 sm:inline-flex" role="radiogroup" aria-label="Theme">
      {opts.map((o, index) => {
        const on = o.v === pref;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            title={o.label}
            onClick={() => choose(o.v)}
            onKeyDown={(event) => {
              const next = event.key === "Home" ? 0 : event.key === "End" ? opts.length - 1
                : ["ArrowRight", "ArrowDown"].includes(event.key) ? (index + 1) % opts.length
                : ["ArrowLeft", "ArrowUp"].includes(event.key) ? (index + opts.length - 1) % opts.length : null;
              if (next === null) return;
              event.preventDefault();
              choose(opts[next].v);
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
            }}
            className={`flex h-8 items-center gap-1.5 rounded-pill px-2.5 text-xs font-medium transition-colors ${
              on ? "bg-paper text-ink shadow-[var(--shadow-pop)]" : "text-ink-2 hover:text-ink"
            }`}
          >
            {o.icon}
            {!compact && <span>{o.label}</span>}
          </button>
        );
      })}
      </div>
    </>
  );
}

const Sun = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Moon = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
const Auto = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
