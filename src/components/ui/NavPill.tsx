"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type NavItem = { href: string; label: string };

/**
 * A pill-shaped nav: one rounded container, links as pills, and a highlight
 * that slides to the active item. "Active" follows the section in view when
 * the hrefs are in-page anchors (#templates), and the hover/focus otherwise.
 */
export function NavPill({ items, activeHref = null, className = "", bare = false }: { items: NavItem[]; activeHref?: string | null; className?: string; bare?: boolean }) {
  const [hover, setHover] = useState<string | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const container = useRef<HTMLElement>(null);
  const links = useRef(new Map<string, HTMLAnchorElement>());
  useEffect(() => {
    const box = container.current;
    const link = activeHref ? links.current.get(activeHref) : null;
    if (!box || !link || box.scrollWidth <= box.clientWidth) return;
    const left = link.offsetLeft;
    const right = left + link.offsetWidth;
    if (left >= box.scrollLeft + 4 && right <= box.scrollLeft + box.clientWidth - 4) return;
    box.scrollTo({ left: left - (box.clientWidth - link.offsetWidth) / 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [activeHref]);

  // A stationary pointer must not override the section selected by scrolling.
  const target = activeHref ?? hover;
  useLayoutEffect(() => {
    const el = target ? links.current.get(target) : null;
    const box = container.current;
    if (!el || !box) return;
    const measure = () => {
      const next = { left: el.offsetLeft, width: el.offsetWidth };
      setPill((previous) => previous?.left === next.left && previous.width === next.width ? previous : next);
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(box);
    links.current.forEach((link) => resize.observe(link));
    return () => resize.disconnect();
  }, [target, items]);

  return (
    <nav
      ref={container}
      aria-label="Primary"
      onMouseLeave={() => setHover(null)}
      className={`relative inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-pill p-1 ${bare ? "" : "bg-paper-2 ring-1 ring-rule/60"} ${className}`}
      style={{ scrollbarWidth: "none" }}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0 top-1 bottom-1 rounded-pill transition-[transform,width,opacity] duration-300 ${bare ? "bg-paper-3" : "bg-paper shadow-[var(--shadow-pop)]"}`}
        style={{
          transform: `translate3d(${pill?.left ?? 0}px, 0, 0)`,
          width: pill?.width ?? 0,
          opacity: target && pill ? 1 : 0,
          transitionTimingFunction: "var(--ease-out)",
        }}
      />
      {items.map((it) => {
        const on = target === it.href;
        return (
          <a
            key={it.href}
            href={it.href.startsWith("/") && !it.href.startsWith("//") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${it.href}` : it.href}
            ref={(el) => {
              if (el) links.current.set(it.href, el);
              else links.current.delete(it.href);
            }}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") setHover(it.href); }}
            onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setHover(it.href); }}
            onBlur={() => setHover(null)}
            aria-current={activeHref === it.href ? "location" : undefined}
            className={`relative z-10 flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-pill px-4 py-2 text-sm font-medium transition-colors lg:min-h-0 ${
              on ? "text-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            {it.label}
          </a>
        );
      })}
    </nav>
  );
}
