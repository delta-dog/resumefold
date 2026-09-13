"use client";

import { useEffect, useState } from "react";
import type { NavItem } from "./NavPill";

export function useSectionNavigation(items: NavItem[]) {
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const sectionKey = JSON.stringify(items.filter((item) => item.href.startsWith("#")).map((item) => item.href));

  useEffect(() => {
    const hrefs: string[] = JSON.parse(sectionKey);
    const sections = hrefs
      .map((href) => ({ href, element: document.getElementById(href.slice(1)) }))
      .filter((section): section is { href: string; element: HTMLElement } => Boolean(section.element));
    if (!sections.length) return;

    let pending: string | null = null;
    let frame = 0;
    let animation = 0;
    let needsMeasure = true;
    let activationTop = 112;
    let maxScroll = 0;
    let positions: { href: string; top: number; margin: number }[] = [];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const measure = () => {
      const y = window.scrollY;
      positions = sections.map(({ href, element }) => ({
        href,
        top: element.getBoundingClientRect().top + y,
        margin: parseFloat(getComputedStyle(element).scrollMarginTop) || 96,
      })).sort((a, b) => a.top - b.top);
      activationTop = positions[0].margin + 16;
      maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      needsMeasure = false;
    };
    const updateActive = () => {
      frame = 0;
      if (needsMeasure) measure();
      if (pending) return;
      const y = Math.max(0, window.scrollY);
      let current: string | null = null;
      for (const section of positions) {
        if (section.top > y + activationTop) break;
        current = section.href;
      }
      if (maxScroll > 0 && y >= maxScroll - 2) current = positions.at(-1)!.href;
      setActiveHref(current);
    };
    const onScroll = () => {
      if (!pending && !frame) frame = requestAnimationFrame(updateActive);
    };
    const onLayout = () => {
      needsMeasure = true;
      if (!frame) frame = requestAnimationFrame(updateActive);
    };
    const cancelMotion = () => {
      cancelAnimationFrame(animation);
      animation = 0;
      pending = null;
    };
    const interrupt = () => {
      if (!pending) return;
      cancelMotion();
      onScroll();
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      const href = link?.getAttribute("href");
      if (!href?.startsWith("#") || link?.hasAttribute("download") || (link?.target && link.target !== "_self")) return;
      const section = sections.find((section) => section.href === href);
      if (!section) return;

      event.preventDefault();
      cancelMotion();
      measure();
      pending = href;
      setActiveHref(href);
      if (window.location.hash !== href) window.history.pushState(null, "", href);
      const start = Math.max(0, window.scrollY);
      const destination = () => {
        if (needsMeasure) measure();
        const position = positions.find((position) => position.href === href)!;
        return Math.max(0, Math.min(maxScroll, position.top - position.margin));
      };
      const target = destination();
      const duration = Math.min(800, 350 + Math.abs(target - start) * 0.08);
      const finish = () => {
        animation = 0;
        cancelAnimationFrame(frame);
        pending = null;
        updateActive();
        if (event.detail === 0) {
          if (!section.element.hasAttribute("tabindex")) {
            section.element.setAttribute("tabindex", "-1");
            section.element.addEventListener("blur", () => section.element.removeAttribute("tabindex"), { once: true });
          }
          section.element.focus({ preventScroll: true });
        }
      };

      // Instant writes avoid a second browser animation competing with this one.
      window.scrollTo({ top: start, behavior: "instant" });
      if (reducedMotion.matches || Math.abs(target - start) < 1) {
        window.scrollTo({ top: target, behavior: "instant" });
        finish();
        return;
      }
      const started = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        window.scrollTo({ top: start + (destination() - start) * eased, behavior: "instant" });
        if (progress < 1) animation = requestAnimationFrame(tick);
        else finish();
      };
      animation = requestAnimationFrame(tick);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Escape"].includes(event.key)) interrupt();
    };

    const resize = new ResizeObserver(onLayout);
    resize.observe(document.body);
    sections.forEach(({ element }) => resize.observe(element));
    frame = requestAnimationFrame(updateActive);
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onLayout);
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("pointerdown", interrupt, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", interrupt);
    window.addEventListener("hashchange", interrupt);
    reducedMotion.addEventListener("change", interrupt);
    return () => {
      cancelAnimationFrame(frame);
      cancelMotion();
      resize.disconnect();
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", interrupt);
      window.removeEventListener("hashchange", interrupt);
      reducedMotion.removeEventListener("change", interrupt);
    };
  }, [sectionKey]);

  return { activeHref };
}
