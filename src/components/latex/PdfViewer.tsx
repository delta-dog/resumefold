"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";
import { loadPdfJs } from "@/lib/pdf";

const ZOOMS = [0.5, 0.67, 0.83, 1, 1.25, 1.5, 2];
function availableWidth(element: HTMLElement | null) {
  if (!element) return 752;
  const style = getComputedStyle(element);
  return Math.max(0, element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
}

/**
 * pdf.js viewer with the controls Overleaf shows: page x / y, zoom − +,
 * fit-to-width on first load. Pages render to canvases inside a scroll pane.
 */
export function PdfViewer({ data, className = "" }: { data: ArrayBuffer | null; className?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState<number | null>(null); // null = fit width
  const [fit, setFit] = useState(1);
  const [pageWidth, setPageWidth] = useState(0);
  const [error, setError] = useState("");

  // Load the document
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        if (cancelled) return;
        setError("");
        setDoc(null);
        task = pdfjs.getDocument({ data: data.slice(0) });
        const d = await task.promise;
        const p1 = await d.getPage(1);
        if (cancelled) return;
        const vw = p1.getViewport({ scale: 1 }).width;
        setPageWidth(vw);
        setFit(Math.max(0.3, Math.min(2, availableWidth(scroller.current) / vw)));
        setDoc(d);
        setPages(d.numPages);
        setPage(1);
      } catch {
        if (!cancelled) setError("The PDF preview could not be loaded. Try recompiling or download the PDF.");
        await task?.destroy().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy().catch(() => {});
    };
  }, [data]);

  // Re-fit when the pane changes size (layout switch, window resize)
  useEffect(() => {
    const el = scroller.current;
    if (!el || !pageWidth) return;
    const ro = new ResizeObserver(() => {
      setFit(Math.max(0.3, Math.min(2, availableWidth(el) / pageWidth)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidth]);

  const scale = (zoom ?? fit) * (typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1);
  const cssScale = zoom ?? fit;

  // Track current page from scroll position
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const canvases = el.querySelectorAll<HTMLElement>("[data-page]");
      const midpoint = el.getBoundingClientRect().top + el.clientHeight / 2;
      let cur = 1;
      for (const c of canvases) {
        if (c.getBoundingClientRect().top < midpoint) cur = Number(c.dataset.page);
      }
      setPage(cur);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); el.removeEventListener("scroll", onScroll); };
  }, [pages]);

  const goTo = (n: number) => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-page="${n}"]`);
    el?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  const zoomStep = (dir: 1 | -1) => {
    const cur = zoom ?? fit;
    const next = dir > 0 ? ZOOMS.find((z) => z > cur + 0.01) ?? ZOOMS[ZOOMS.length - 1] : [...ZOOMS].reverse().find((z) => z < cur - 0.01) ?? ZOOMS[0];
    setZoom(next);
  };

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="flex min-h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-rule/60 bg-paper px-2 text-xs">
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => goTo(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Previous page">
            ↑
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => goTo(Math.min(pages, page + 1))} disabled={page >= pages} aria-label="Next page">
            ↓
          </button>
          <span className="rounded-md bg-paper-3 px-2 py-1 font-mono tabular-nums">
            {pages ? page : "–"} / {pages || "–"}
          </span>
          <span className="mx-1 h-4 w-px bg-rule" />
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => zoomStep(-1)} aria-label="Zoom out">
            −
          </button>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => zoomStep(1)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="rounded-md px-2 py-1 font-mono tabular-nums hover:bg-paper-3" onClick={() => setZoom(null)} title="Fit to width">
            {Math.round(cssScale * 100)}%
          </button>
        </div>
      </div>
      <div ref={scroller} data-pdf-scroller className="min-h-0 flex-1 overflow-auto overscroll-contain scroll-thin bg-paper-3 p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:p-6">
        {error ? <p role="alert" className="p-4 text-sm text-danger">{error}</p> : doc ? (
          <div className="mx-auto flex w-max flex-col gap-4">
            {Array.from({ length: pages }, (_, i) => (
              <PageCanvas key={i + 1} doc={doc} n={i + 1} scale={scale} cssScale={cssScale} />
            ))}
          </div>
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-sm text-ink-2">Select Recompile to preview your PDF.</div>
        )}
      </div>
    </div>
  );
}

function PageCanvas({ doc, n, scale, cssScale }: { doc: PDFDocumentProxy; n: number; scale: number; cssScale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { root: canvas.closest("[data-pdf-scroller]"), rootMargin: "300px" });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let task: RenderTask | null = null;
    let cancelled = false;
    (async () => {
      try {
        const p = await doc.getPage(n);
        const vp = p.getViewport({ scale });
        const canvas = ref.current;
        if (!canvas || cancelled) return;
        const ratio = cssScale / scale;
        canvas.style.width = `${vp.width * ratio}px`;
        canvas.style.height = `${vp.height * ratio}px`;
        if (!visible) { canvas.width = 0; canvas.height = 0; return; }
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas is not available.");
        task = p.render({ canvasContext: ctx, viewport: vp, canvas });
        await task.promise;
        if (!cancelled) setError("");
      } catch {
        if (!cancelled) setError("This page could not be rendered. Try downloading the PDF.");
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, n, scale, cssScale, visible]);
  return <div className="relative" data-page={n}><canvas ref={ref} aria-label={`PDF page ${n}`} className="block bg-white" style={{ boxShadow: "var(--shadow-sheet)" }} />{error && <p role="alert" className="absolute inset-x-0 top-0 bg-paper p-3 text-sm text-danger">{error}</p>}</div>;
}
