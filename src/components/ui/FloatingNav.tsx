"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { NavPill, type NavItem } from "./NavPill";
import { ThemeToggle } from "./ThemeToggle";
import { useSectionNavigation } from "./useSectionNavigation";

/** Always visible; condenses to a frosted pill as the page scrolls. */
export function FloatingNav({ brand, items, cta }: { brand: string; items: NavItem[]; cta: { href: string; label: string } }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { activeHref } = useSectionNavigation(items);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (header.current?.querySelector('[aria-label^="Appearance:"][aria-expanded="true"]')) return;
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      setScrolled((wasScrolled) => y > 32 || (wasScrolled && y > 8));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const syncViewport = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("scroll", onScroll);
      if (desktop.matches) {
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
      } else {
        setScrolled(false);
      }
    };
    syncViewport();
    desktop.addEventListener("change", syncViewport);
    return () => {
      cancelAnimationFrame(frame);
      desktop.removeEventListener("change", syncViewport);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 sm:px-6" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
      <header
        ref={header}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false); }}
        className={`floating-header pointer-events-auto relative flex h-[52px] w-full items-center gap-1 rounded-pill p-1 lg:backdrop-blur-sm lg:transition-[max-width,background-color,box-shadow] lg:duration-300 lg:h-14 lg:gap-2 lg:pl-5 ${
          scrolled
            ? "max-w-[960px] bg-paper/85 shadow-[var(--shadow-pop)] ring-1 ring-rule/60"
            : "max-w-[1440px] bg-paper/60 ring-1 ring-transparent"
        }`}
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <Link href="/" className="shrink-0 px-2 font-display text-base font-bold tracking-tight sm:text-[20px] lg:px-0" aria-label={`${brand} home`}>
          {brand}
        </Link>

        <div className="hidden lg:mx-auto lg:block">
          <NavPill bare items={items} activeHref={activeHref} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0 lg:gap-2">
          <ThemeToggle compact />
          <Link href={cta.href} className="btn btn-primary btn-sm px-3 text-xs sm:px-4 sm:text-[13px]">
            <span className="sm:hidden">Build</span>
            <span className="hidden sm:inline lg:hidden">Build resume</span>
            <span className="hidden lg:inline">{cta.label}</span>
          </Link>
          <button ref={menuButton} type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls={menuId} onClick={() => setMenuOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center rounded-pill text-ink hover:bg-paper-3 lg:hidden">
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d={menuOpen ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
        </div>
        <div id={menuId} hidden={!menuOpen} className="absolute inset-x-0 top-full mt-2 max-h-[calc(100dvh-88px-env(safe-area-inset-top))] overflow-y-auto rounded-[20px] border border-rule bg-paper p-2 shadow-[var(--shadow-pop)] lg:hidden">
          <nav aria-label="Mobile sections">
            {items.map((item) => (
              <a key={item.href} href={item.href.startsWith("/") && !item.href.startsWith("//") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${item.href}` : item.href} aria-current={activeHref === item.href ? "location" : undefined} onClick={() => setMenuOpen(false)} className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-medium ${activeHref === item.href ? "bg-paper-3 text-ink" : "text-ink-2 hover:bg-paper-3 hover:text-ink"}`}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
    </div>
  );
}
