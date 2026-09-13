"use client";

import { useState } from "react";
import { useActiveResume, useResumeStore } from "@/lib/store";
import type { ResumeStyle } from "@/lib/schema";

type Opt<K extends keyof ResumeStyle> = { value: ResumeStyle[K]; label: string; swatch?: string };

const FONT: Opt<"font">[] = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "mixed", label: "Serif headings" },
];
const SIZE: Opt<"size">[] = [
  { value: "10", label: "10 pt" },
  { value: "10.5", label: "10.5 pt" },
  { value: "11", label: "11 pt" },
];
const MARGINS: Opt<"margins">[] = [
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "roomy", label: "Roomy" },
];
const LEADING: Opt<"leading">[] = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Relaxed" },
];
const ACCENT: Opt<"accent">[] = [
  { value: "none", label: "Ink", swatch: "#111111" },
  { value: "blue", label: "Blue", swatch: "#1a5fb4" },
  { value: "green", label: "Green", swatch: "#1e6b3a" },
  { value: "burgundy", label: "Burgundy", swatch: "#7a2432" },
  { value: "graphite", label: "Graphite", swatch: "#4a4d52" },
];

/** Fine-tuning for the HTML layouts. Every option stays single-column and text-only. */
export function StylePanel() {
  const style = useActiveResume().meta.style;
  const update = useResumeStore((s) => s.update);
  const [advanced, setAdvanced] = useState(Boolean(style.css));

  const set = <K extends keyof ResumeStyle>(k: K, v: ResumeStyle[K]) =>
    update((d) => {
      d.meta.style[k] = v;
    });

  return (
    <div className="grid gap-5">
      <Row label="Typeface">
        <Segmented options={FONT} value={style.font} onChange={(v) => set("font", v)} />
      </Row>
      <Row label="Size">
        <Segmented options={SIZE} value={style.size} onChange={(v) => set("size", v)} />
      </Row>
      <Row label="Margins">
        <Segmented options={MARGINS} value={style.margins} onChange={(v) => set("margins", v)} />
      </Row>
      <Row label="Line spacing">
        <Segmented options={LEADING} value={style.leading} onChange={(v) => set("leading", v)} />
      </Row>
      <Row label="Accent">
        <div className="flex flex-wrap gap-2">
          {ACCENT.map((o) => {
            const on = style.accent === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => set("accent", o.value)}
                aria-pressed={on}
                className={`flex min-h-11 items-center gap-2 rounded-pill py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors sm:min-h-0 ${
                  on ? "bg-signal-soft text-signal-2" : "bg-paper-3 text-ink-2 hover:text-ink"
                }`}
              >
                <span className="h-5 w-5 rounded-full ring-1 ring-rule-2" style={{ background: o.swatch }} />
                {o.label}
              </button>
            );
          })}
        </div>
      </Row>

      <div>
        <button type="button" className="link text-sm" onClick={() => setAdvanced((a) => !a)}>
          {advanced ? "Hide" : "Show"} custom CSS
        </button>
        {advanced && (
          <div className="fade-in mt-3">
            <textarea
              className="field font-mono text-xs"
              rows={6}
              value={style.css}
              onChange={(e) => set("css", e.target.value)}
              spellCheck={false}
              placeholder={".rs-name { letter-spacing: .02em }\n.rs--standard .rs-sec-h { border-bottom-width: 1.2pt }"}
            />
            <p className="mt-1.5 text-xs text-ink-3">
              Applied to the preview and the PDF. Keep it to type and spacing. Columns, images and text boxes break parsers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <span className="text-sm font-medium text-ink-2">{label}</span>
      {children}
    </div>
  );
}

function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl bg-paper-3 p-1 sm:rounded-pill" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`min-h-11 rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
              on ? "bg-paper text-ink shadow-[var(--shadow-pop)]" : "text-ink-2 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
