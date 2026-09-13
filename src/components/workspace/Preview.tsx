"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ResumeDocument } from "@/lib/templates/html/ResumeDocument";
import { RESUME_CSS, RESUME_FONTS_URL } from "@/lib/templates/html/styles";
import { useFocusStore } from "@/lib/focus";
import type { Resume } from "@/lib/schema";

const PAGE_W = { letter: 8.5 * 96, a4: (210 / 25.4) * 96 };
const PAGE_H = { letter: 11 * 96, a4: (297 / 25.4) * 96 };

/**
 * The centrepiece: a real-size sheet scaled to fit its pane. The sheet is the
 * only pure-white surface in the app so it reads as paper on the bone ground.
 */
export function Preview({ resume, lift = false }: { resume: Resume; lift?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [pages, setPages] = useState(1);
  const focused = useFocusStore((s) => s.field);
  const paper = resume.meta.paper;
  const pw = PAGE_W[paper];
  const ph = PAGE_H[paper];

  // Fit-to-width
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.max(0, entry.contentRect.width);
      setScale(Math.min(1, w / pw));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pw]);

  // Page count estimate from rendered height
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPages(Math.max(1, Math.ceil((el.scrollHeight - 1) / ph))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ph, resume]);

  // Spotlight the field being edited
  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    el.querySelectorAll(".rs-hi").forEach((n) => n.classList.remove("rs-hi"));
    if (!focused) return;
    const exact = el.querySelector<HTMLElement>(`[data-field="${CSS.escape(focused)}"]`);
    const target = exact ?? el.querySelector<HTMLElement>(`[data-field^="${CSS.escape(focused)}"]`);
    if (target) {
      target.classList.add("rs-hi");
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focused, resume]);

  return (
    <div ref={wrap} className="relative h-full w-full overflow-auto overscroll-contain scroll-thin px-3 pb-[max(40px,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6">
      <link rel="stylesheet" href={RESUME_FONTS_URL} />
      <style dangerouslySetInnerHTML={{ __html: RESUME_CSS }} />
      {resume.meta.style.css && <style dangerouslySetInnerHTML={{ __html: resume.meta.style.css }} />}
      <div
        className="mx-auto transition-[height] duration-200"
        style={{ width: pw * scale, height: Math.max(ph, pages * ph) * scale }}
      >
        <div
          ref={sheet}
          className="relative origin-top-left rounded-[3px] transition-[box-shadow,transform] duration-300"
          style={{
            width: pw,
            transform: `scale(${scale})${lift ? " translateY(-4px)" : ""}`,
            boxShadow: lift ? "var(--shadow-sheet-lift)" : "var(--shadow-sheet)",
            background: "#fff",
          }}
        >
          {/* Page-break guides */}
          {pages > 1 &&
            Array.from({ length: pages - 1 }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-signal/40"
                style={{ top: (i + 1) * ph }}
              />
            ))}
          <div className="relative">
            <ResumeDocument resume={resume} />
          </div>
        </div>
      </div>
      <div className="pointer-events-none sticky bottom-2 mt-3 flex justify-center">
        <span className="rounded-pill bg-paper px-3 py-1 text-xs font-medium text-ink-2" style={{ boxShadow: "var(--shadow-pop)" }}>
          {pages} {pages === 1 ? "page" : "pages"} · {paper === "a4" ? "A4" : "Letter"} · {Math.round(scale * 100)}%
        </span>
      </div>
    </div>
  );
}
