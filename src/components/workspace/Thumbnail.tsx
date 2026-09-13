"use client";

import { ResumeDocument } from "@/lib/templates/html/ResumeDocument";
import { useEffect, useRef, useState } from "react";
import type { HtmlTemplateId, Resume } from "@/lib/schema";

const W = 8.5 * 96;
const H = 11 * 96;

/** A live, scaled-down render of the user's own resume in a given template. */
export function Thumbnail({
  resume,
  template,
  variant,
  width = 220,
}: {
  resume: Resume;
  template?: HtmlTemplateId;
  variant?: string;
  width?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [fittedWidth, setFittedWidth] = useState(width);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setFittedWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const scale = fittedWidth / W;
  const letter = { ...resume, meta: { ...resume.meta, paper: "letter" as const } };
  return (
    <div ref={container} className="relative mx-auto w-full overflow-hidden rounded-[6px] bg-white" style={{ maxWidth: width, aspectRatio: `${W} / ${H}` }} aria-hidden>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, transform: `scale(${scale})` }}>
        <ResumeDocument resume={letter} template={template} variant={variant} />
      </div>
    </div>
  );
}
