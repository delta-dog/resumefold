import type { CSSProperties } from "react";
import type { ResumeStyle } from "@/lib/schema";

/**
 * CSS for the rendered resume sheet. Used verbatim by the live preview
 * (injected in a <style>) and by the PDF route (inlined in the printed page),
 * so what you see is what Chromium prints.
 *
 * Everything here is single-column by construction (ATS rule A1). The only
 * layout device is a flex row for "title ... date", which extracts as one
 * line of text, the same way a tabular* row does in LaTeX.
 *
 * User-tunable knobs (font pairing, size, margins, leading, accent) arrive as
 * CSS custom properties set inline on the <article> — see styleVars().
 */
export const RESUME_FONTS_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/fonts/resume.css`;

const ACCENTS: Record<ResumeStyle["accent"], string> = {
  none: "#111111",
  blue: "#1a5fb4",
  green: "#1e6b3a",
  burgundy: "#7a2432",
  graphite: "#4a4d52",
};

const MARGINS: Record<ResumeStyle["margins"], [string, string]> = {
  tight: ["0.42in", "0.5in"],
  normal: ["0.5in", "0.62in"],
  roomy: ["0.65in", "0.8in"],
};

const LEADING: Record<ResumeStyle["leading"], string> = { compact: "1.22", normal: "1.32", relaxed: "1.42" };

/** Inline custom properties for the sheet, derived from the user's style choices. */
export function styleVars(s: ResumeStyle): CSSProperties {
  const [py, px] = MARGINS[s.margins];
  const vars: Record<string, string> = {
    "--body": s.font === "serif" ? "var(--serif)" : "var(--sans)",
    "--head": s.font === "sans" ? "var(--sans)" : "var(--serif)",
    "--fs": `${s.size}pt`,
    "--lh": LEADING[s.leading],
    "--pad-y": py,
    "--pad-x": px,
    "--accent": ACCENTS[s.accent],
    "--accent-on": s.accent === "none" ? "0" : "1",
  };
  return vars as CSSProperties;
}

export const RESUME_CSS = `
.rs{--serif:"Source Serif 4",Georgia,"Times New Roman",serif;--sans:"Source Sans 3",Arial,Helvetica,sans-serif;
  --body:var(--sans);--head:var(--sans);--fs:10.5pt;--lh:1.32;--pad-y:.5in;--pad-x:.62in;--accent:#111;
  --ink:#111;--muted:#3b3934;--rule:#1f1d1a;
  box-sizing:border-box;background:#fff;color:var(--ink);width:8.5in;min-height:11in;padding:var(--pad-y) var(--pad-x);
  font-family:var(--body);font-size:var(--fs);line-height:var(--lh);-webkit-font-smoothing:antialiased;}
.rs.rs--a4{width:210mm;min-height:297mm}
.rs *{box-sizing:border-box;margin:0;padding:0}
.rs a{color:inherit;text-decoration:none}
.rs-head{margin-bottom:9pt}
.rs-name{font-family:var(--head);font-size:2.1em;font-weight:700;letter-spacing:-.012em;line-height:1.1;color:var(--accent)}
.rs-headline{font-size:1.05em;margin-top:2pt;color:var(--muted)}
.rs-contact{font-size:.92em;margin-top:4pt;line-height:1.5}
.rs-contact .item{white-space:nowrap}
.rs-contact .sep{margin:0 2pt;color:#777}
.rs-sec{margin-top:9pt;break-inside:auto}
.rs-sec-h{font-family:var(--head);font-size:1em;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:var(--accent);border-bottom:.8pt solid var(--accent);padding-bottom:1.5pt;margin-bottom:5pt;break-after:avoid}
.rs-entry{margin-bottom:6pt;break-inside:avoid}
.rs-row{display:flex;justify-content:space-between;align-items:baseline;gap:10pt}
.rs-t{font-weight:700}
.rs-sub{font-style:italic}
.rs-r{white-space:nowrap;font-size:.95em;color:var(--muted);font-variant-numeric:tabular-nums}
.rs-summary{margin-bottom:2pt}
.rs ul{padding-left:12pt;margin-top:2.5pt;list-style:disc}
.rs li{margin-bottom:1.6pt;padding-left:1.5pt}
.rs-skills p{margin-bottom:1.8pt}
.rs-skills b{font-weight:700}
.rs-cert{margin-bottom:2pt;break-inside:avoid}

/* ---- Standard: centred header, uppercase headings on a full rule ---- */
.rs--standard .rs-head{text-align:center}
.rs--standard .rs-name{font-size:2.2em}

/* ---- Student: LaTeX-like, small caps, dense; headings in ink, rule in accent ---- */
.rs--student{--body:var(--serif);--head:var(--serif);line-height:calc(var(--lh) - .04)}
.rs--student .rs-head{text-align:center;margin-bottom:6pt}
.rs--student .rs-name{font-size:2.3em;font-weight:700;letter-spacing:0;font-variant:small-caps}
.rs--student .rs-headline{display:none}
.rs--student .rs-sec{margin-top:7pt}
.rs--student .rs-sec-h{font-variant:small-caps;text-transform:none;letter-spacing:.02em;font-size:1.15em;font-weight:600;padding-bottom:0;color:var(--ink)}
.rs--student .rs-entry{margin-bottom:4pt}
.rs--student .rs-r{color:var(--ink);font-style:italic}
.rs--student li{margin-bottom:.8pt}

/* ---- Combination: name left, contact block right, short heavy accent bars ---- */
.rs--combination .rs-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16pt;border-bottom:1.6pt solid var(--accent);padding-bottom:8pt;margin-bottom:6pt}
.rs--combination .rs-name{font-size:2.3em;letter-spacing:-.02em}
.rs--combination .rs-headline{font-size:1.1em;font-weight:600;color:var(--ink)}
.rs--combination .rs-contact{text-align:right;margin-top:0;max-width:3.2in}
.rs--combination .rs-contact .sep{display:none}
.rs--combination .rs-contact .item{display:block}
.rs--combination .rs-sec{margin-top:11pt}
.rs--combination .rs-sec-h{border:0;padding:0;margin-bottom:6pt;font-size:.9em;letter-spacing:.08em}
.rs--combination .rs-sec-h::after{content:"";display:block;width:26pt;height:2pt;background:var(--accent);margin-top:3pt}
.rs--combination .rs-skills p{margin-bottom:2.5pt}

/* ---- Senior: large name, italic headline, title-case headings on a hairline ---- */
.rs--senior{--head:var(--serif);line-height:calc(var(--lh) + .05)}
.rs--senior .rs-name{font-size:2.5em;font-weight:600;letter-spacing:-.01em}
.rs--senior .rs-headline{font-family:var(--head);font-size:1.2em;font-style:italic;color:#222;margin-top:3pt}
.rs--senior .rs-head{margin-bottom:12pt}
.rs--senior .rs-sec{margin-top:12pt}
.rs--senior .rs-sec-h{text-transform:none;letter-spacing:0;font-size:1.25em;font-weight:600;border-bottom:.6pt solid #999;padding-bottom:3pt;margin-bottom:7pt}
.rs--senior .rs-entry{margin-bottom:9pt}
.rs--senior .rs-t{font-size:1.05em}
.rs--senior li{margin-bottom:2.4pt}

/* ---- Approximate previews of the LaTeX styles (thumbnails only; Overleaf renders the real thing) ---- */
.rs--tex-classic{font-family:"Source Serif 4",serif;padding:.5in .5in;font-size:10.5pt;line-height:1.25}
.rs--tex-classic .rs-head{text-align:center;margin-bottom:6pt}
.rs--tex-classic .rs-name{font-family:inherit;font-size:24pt;font-variant:small-caps;font-weight:700;color:#111}
.rs--tex-classic .rs-headline{display:none}
.rs--tex-classic .rs-sec-h{font-family:inherit;font-variant:small-caps;text-transform:none;letter-spacing:0;font-size:12pt;font-weight:600;padding-bottom:0;color:#111;border-color:#111}
.rs--tex-classic .rs-entry{margin-bottom:3pt}
.rs--tex-classic li{margin-bottom:.5pt}

.rs--tex-bold{--accent:#c7522a;font-family:var(--sans);padding:.45in .6in}
.rs--tex-bold .rs-head{text-align:center;margin-bottom:10pt}
.rs--tex-bold .rs-name{font-family:var(--sans);font-size:30pt;font-weight:400;letter-spacing:.02em;text-transform:uppercase;color:#111}
.rs--tex-bold .rs-name::first-letter{font-weight:700}
.rs--tex-bold .rs-headline{color:var(--accent);font-size:10pt;letter-spacing:.1em;text-transform:uppercase}
.rs--tex-bold .rs-sec-h{font-family:var(--sans);color:var(--accent);border-bottom:1pt solid #999;font-size:13pt;letter-spacing:0;text-transform:none;font-weight:700}
.rs--tex-bold .rs-r{color:var(--accent);font-style:italic}

.rs--tex-banking{font-family:var(--serif);padding:.6in .7in;line-height:1.3}
.rs--tex-banking .rs-head{text-align:center;border-bottom:.6pt solid #222;padding-bottom:6pt;margin-bottom:8pt}
.rs--tex-banking .rs-name{font-family:var(--serif);font-size:22pt;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#111}
.rs--tex-banking .rs-headline{font-style:italic}
.rs--tex-banking .rs-sec-h{font-family:var(--serif);text-transform:uppercase;letter-spacing:.12em;font-size:10pt;border-bottom:.5pt solid #222;color:#111}

.rs--tex-columns{font-family:"Lato",var(--sans);padding:.4in .5in;display:grid;grid-template-columns:2.2in 1fr;column-gap:.3in;align-content:start}
.rs--tex-columns .rs-head{grid-column:1/-1;border-bottom:1.2pt solid #222;padding-bottom:6pt;margin-bottom:8pt;display:flex;justify-content:space-between;align-items:flex-end}
.rs--tex-columns .rs-name{font-family:inherit;font-size:28pt;font-weight:300;letter-spacing:.01em;color:#111}
.rs--tex-columns .rs-contact{text-align:right;margin-top:0;font-size:9pt}
.rs--tex-columns .rs-contact .sep{display:none}
.rs--tex-columns .rs-contact .item{display:block}
.rs--tex-columns .rs-headline{display:none}
.rs--tex-columns .rs-sec{grid-column:2;margin-top:8pt}
.rs--tex-columns .rs-sec[data-sec="skills"],.rs--tex-columns .rs-sec[data-sec="education"],.rs--tex-columns .rs-sec[data-sec="certifications"]{grid-column:1;font-size:9.5pt}
.rs--tex-columns .rs-sec-h{font-family:inherit;font-size:11pt;letter-spacing:.08em;border-bottom:.8pt solid #444;color:#111}
.rs--tex-columns .rs-sec[data-sec="skills"] .rs-row,.rs--tex-columns .rs-sec[data-sec="education"] .rs-row{display:block}
.rs--tex-columns .rs-skills p{margin-bottom:4pt}
.rs--tex-columns .rs-skills b{display:block}

@media print{
  html,body{margin:0;padding:0;background:#fff}
  .rs{min-height:0;width:auto}
}
`;
