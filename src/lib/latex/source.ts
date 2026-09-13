import type { Resume } from "@/lib/schema";
import { renderLatex, type LatexOutput } from "@/lib/templates/latex";

/**
 * The .tex a user actually exports: their hand-edited source from the LaTeX
 * studio if they have one, otherwise a fresh render from data.
 */
export function latexForExport(r: Resume): LatexOutput & { edited: boolean } {
  const gen = renderLatex(r);
  if (r.meta.latexSource.trim()) {
    return { ...gen, files: { ...gen.files, [gen.main]: r.meta.latexSource }, edited: true };
  }
  return { ...gen, edited: false };
}
