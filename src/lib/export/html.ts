import { RESUME_CSS, RESUME_FONTS_URL } from "@/lib/templates/html/styles";

/**
 * Wrap the sheet markup (taken straight from the live preview DOM, so what you
 * see is exactly what prints) in a standalone printable document.
 */
export function wrapPrintHtml(sheetHtml: string, paper: "letter" | "a4", title: string, extraCss = ""): string {
  const size = paper === "a4" ? "A4" : "Letter";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${RESUME_FONTS_URL}">
<style>
@page { size: ${size}; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
${RESUME_CSS}
${extraCss}
</style>
</head>
<body>${sheetHtml}</body>
</html>`;
}

/** Only our own markup should ever reach the printer: drop anything executable. */
export function sanitizeSheetHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed|link|meta|base)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** User CSS for the sheet: no imports, no closing tags, no external fetches. */
export function sanitizeCss(css: string): string {
  return css
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/@import[^;]*;?/gi, "")
    .replace(/url\s*\([^)]*\)/gi, "none")
    .replace(/expression\s*\(/gi, "(");
}
