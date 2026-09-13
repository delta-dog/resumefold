"use client";

import { HTML_TEMPLATES, LATEX_STYLES } from "@/lib/templates";
import { useActiveResume, useResumeStore } from "@/lib/store";
import { Thumbnail } from "../Thumbnail";
import { StylePanel } from "../StylePanel";
import { sampleResume } from "@/lib/sample";
import { sectionHasContent } from "@/lib/schema";

export function StepTemplate() {
  const r = useActiveResume();
  const update = useResumeStore((s) => s.update);
  // Thumbnails render your data — unless the resume is still empty, then the sample.
  const hasContent = r.contact.fullName || r.experience.length || r.education.length;
  const shown = hasContent ? r : sampleResume;

  return (
    <div className="grid gap-10">
      <section className="grid gap-4">
        <div>
          <h3 className="font-display text-md font-bold">Layout</h3>
          <p className="mt-1 text-sm text-ink-2">
            Choose a single-column layout for your preview, PDF and DOCX.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          {HTML_TEMPLATES.map((t) => {
            const active = r.meta.template === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  update((d) => {
                    d.meta.template = t.id;
                    d.meta.sectionOrder = t.sectionOrder;
                  })
                }
                aria-pressed={active}
                className={`group grid min-w-0 gap-3 rounded-card p-3 text-left transition-colors duration-200 ${
                  active ? "bg-signal-soft ring-2 ring-signal" : "bg-paper-2 hover:bg-paper-3"
                }`}
              >
                <div className="overflow-hidden rounded-[8px]" style={{ boxShadow: "var(--shadow-pop)" }}>
                  <Thumbnail resume={shown} template={t.id} width={228} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-sm font-semibold">{t.name}</span>
                    <span className="chip bg-moss-soft text-moss">ATS-safe</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-2">{t.tagline}</p>
                  <p className="mt-1 text-xs text-ink-3">{t.bestFor}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h3 className="font-display text-md font-bold">Fine-tune</h3>
          <p className="mt-1 text-sm text-ink-2">Adjust fonts, spacing and colour. Changes appear in the preview.</p>
        </div>
        <div className="card p-5">
          <StylePanel />
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h3 className="font-display text-md font-bold">LaTeX style</h3>
          <p className="mt-1 text-sm text-ink-2">
            Choose a style for <span className="font-mono text-xs">.tex</span> and Overleaf. For an exact preview, compile in the studio.
          </p>
          {r.meta.latexSource.trim() && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber">
              <span className="chip bg-amber-soft text-amber">Hand-edited source in use</span>
              Choosing a different style here discards those edits.
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          {LATEX_STYLES.map((t) => {
            const active = r.meta.latexStyle === t.id;
            const hidesSummary = t.id === "columns" && sectionHasContent(shown, "summary");
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  update((d) => {
                    if (d.meta.latexStyle !== t.id) {
                      d.meta.latexSource = "";
                      d.meta.latexSourceStyle = undefined;
                    }
                    d.meta.latexStyle = t.id;
                  })
                }
                aria-pressed={active}
                className={`group grid min-w-0 gap-3 rounded-card p-3 text-left transition-colors duration-200 ${
                  active ? "bg-signal-soft ring-2 ring-signal" : "bg-paper-2 hover:bg-paper-3"
                }`}
              >
                <div className="overflow-hidden rounded-[8px]" style={{ boxShadow: "var(--shadow-pop)" }}>
                  <Thumbnail resume={shown} variant={`tex-${t.id}`} width={228} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-sm font-semibold">{t.name}</span>
                    {t.atsSafe ? (
                      <span className="chip bg-moss-soft text-moss">ATS-safe</span>
                    ) : (
                      <span className="chip bg-amber-soft text-amber">Humans only</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-ink-2">{t.tagline}</p>
                  <p className="mt-1 text-xs text-ink-3">{t.detail}</p>
                  {hidesSummary && <p className="mt-1 text-xs text-amber">Summary is omitted in this style.</p>}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
