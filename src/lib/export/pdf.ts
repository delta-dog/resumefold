"use client";

import type { Resume } from "@/lib/schema";
import { wrapPrintHtml } from "./html";

/** The live preview's sheet, minus the editor-only spotlight class. */
export function currentSheetHtml(): string | null {
  const el = document.querySelector<HTMLElement>("article.rs");
  if (!el) return null;
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".rs-hi").forEach((n) => n.classList.remove("rs-hi"));
  return clone.outerHTML;
}

/**
 * Print the sheet from a hidden iframe. The browser's "Save as PDF" produces
 * a real, text-selectable PDF of exactly the preview markup — no server.
 * Page size and zero margins come from the @page rule in the print document.
 */
export async function printSheet(r: Resume): Promise<{ ok: boolean; reason?: string }> {
  const html = currentSheetHtml();
  if (!html) return { ok: false, reason: "Preview not rendered" };
  const doc = wrapPrintHtml(html, r.meta.paper, `${r.contact.fullName || "Resume"}, Resume`, r.meta.style.css);

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    return { ok: false, reason: "Could not open print frame" };
  }
  win.document.open();
  win.document.write(doc);
  win.document.close();

  // Title becomes the default filename in most browsers' Save-as-PDF dialog.
  win.document.title = filenameBase(r);
  try {
    await Promise.all(Array.from(win.document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'), (link) => {
      if (link.sheet) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error("Font stylesheet took too long to load")), 10_000);
        const finish = (error?: Error) => {
          clearTimeout(timer);
          link.onload = null;
          link.onerror = null;
          if (error) reject(error);
          else resolve();
        };
        link.onload = () => finish();
        link.onerror = () => finish(new Error("Could not load the resume fonts"));
      });
    }));
  } catch {
    frame.remove();
    return { ok: false, reason: "Could not load the resume fonts. Please try again." };
  }
  await win.document.fonts?.ready;
  await new Promise((res) => setTimeout(res, 150));

  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  win.addEventListener("afterprint", cleanup, { once: true });
  win.focus();
  win.print();
  // Safari never fires afterprint reliably; remove later regardless.
  setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  return { ok: true };
}

function filenameBase(r: Resume) {
  const base = r.contact.fullName.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "Resume";
  return `${base}-Resume`;
}
