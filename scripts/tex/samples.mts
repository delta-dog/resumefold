/** Writes the four sample .tex files used to trace which TeX files the bundle needs. */
import { writeFileSync, mkdirSync } from "node:fs";
import { sampleResume } from "../../src/lib/sample";
import { renderLatex } from "../../src/lib/templates/latex";
import { LATEX_STYLE_IDS } from "../../src/lib/schema";

const out = process.argv[2];
if (!out) throw new Error("usage: tsx scripts/tex/samples.mts <outDir>");
mkdirSync(out, { recursive: true });
for (const s of LATEX_STYLE_IDS) writeFileSync(`${out}/${s}.tex`, renderLatex(sampleResume, s).files["resume.tex"]);
console.log(`wrote ${LATEX_STYLE_IDS.length} samples to ${out}`);
