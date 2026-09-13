"use client";

import { STEPS, type StepId } from "@/lib/steps";
import type { Resume } from "@/lib/schema";
import { useEffect, useRef } from "react";

const ROW = 44;

/**
 * Step navigation. Vertical list with a sliding selected-chip on large
 * screens; a horizontally scrolling chip row below that.
 */
export function Rail({
  active,
  onSelect,
  resume,
}: {
  active: StepId;
  onSelect: (id: StepId) => void;
  resume: Resume;
}) {
  const idx = STEPS.findIndex((s) => s.id === active);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const element = list.current;
    const selected = element?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!element || !selected || getComputedStyle(element).overflowX !== "auto") return;
    const left = selected.getBoundingClientRect().left - element.getBoundingClientRect().left + element.scrollLeft;
    element.scrollTo({ left: left - (element.clientWidth - selected.offsetWidth) / 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [active]);
  return (
    <nav aria-label="Steps" className="relative px-2">
      {/* sliding selected-chip background (vertical layout only) */}
      <span
        aria-hidden
        className="absolute left-2 right-2 hidden rounded-pill bg-signal-soft transition-[top] duration-300 lg:block"
        style={{ top: idx * ROW + 4, height: ROW - 8, transitionTimingFunction: "var(--ease-out)" }}
      />
      <ol ref={list} className="scroll-thin relative flex gap-1 overflow-x-auto overscroll-x-contain pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0">
        {STEPS.map((s) => {
          const p = s.progress(resume);
          const isActive = s.id === active;
          return (
            <li key={s.id} className="shrink-0 lg:h-11">
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={isActive ? "step" : undefined}
                className={`flex h-11 items-center gap-2 rounded-pill px-3 text-left text-sm font-medium transition-colors lg:h-full lg:w-full lg:gap-3 lg:px-4 ${
                  isActive
                    ? "bg-signal-soft text-signal-2 lg:bg-transparent"
                    : "text-ink-2 hover:bg-paper-3 hover:text-ink"
                }`}
              >
                <span className="relative grid h-5 w-5 shrink-0 place-items-center">
                  <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
                    <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
                    <circle
                      cx="10"
                      cy="10"
                      r="7.5"
                      fill="none"
                      stroke={p >= 1 ? "var(--moss)" : "currentColor"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 7.5}
                      strokeDashoffset={2 * Math.PI * 7.5 * (1 - p)}
                      style={{ transition: "stroke-dashoffset 300ms var(--ease-out)" }}
                    />
                  </svg>
                  {p >= 1 && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      className="absolute"
                      fill="none"
                      stroke="var(--moss)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 5.2l2 2 4-4.4" />
                    </svg>
                  )}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
