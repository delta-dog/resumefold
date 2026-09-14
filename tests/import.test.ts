import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { spawnSync } from "node:child_process";
import { resumePdf } from "./pdf-fixture";
import { parseImportDate, parseResumeText } from "../src/lib/import/parse";
import { MAX_FILE_BYTES, readDocxXml, validateResumeFile, validateDocxArchive } from "../src/lib/import/extract";

export const RESUME_TEXT = `Alex Morgan
Software Engineer
alex.morgan@example.com | +1 415 555 0123 | Boston, MA
https://linkedin.com/in/alexmorgan
Summary
Engineer building reliable services for financial reporting.
Work Experience
Software Engineer | Example Labs
Jan 2023 - Present
- Built Python and SQL services for 200 customers.
- Reduced processing time by 35%.
Developer | Earlier Labs
Jun 2020 - Dec 2022
- Built React and TypeScript dashboards.
Education
Example University | Bachelor of Science in Computer Science
Sep 2016 - May 2020
Skills
Languages: Python, SQL, TypeScript
Tools: React, Git, Docker
Projects
Budget Tracker | Python
Jan 2024 - Feb 2024
- Shipped a financial reporting tool.
Certifications
AWS Certified Developer`;

test("maps a conventional resume without losing the original text", () => {
  const r = parseResumeText(RESUME_TEXT, "resume.txt");
  assert.equal(r.contact.fullName, "Alex Morgan");
  assert.equal(r.contact.email, "alex.morgan@example.com");
  assert.equal(r.contact.location, "Boston, MA");
  assert.equal(r.experience.length, 2);
  assert.equal(r.experience[0].company, "Example Labs");
  assert.equal(r.experience[0].start, "2023-01");
  assert.equal(r.experience[0].current, true);
  assert.equal(r.experience[0].bullets.length, 2);
  assert.equal(r.experience[1].end, "2022-12");
  assert.equal(r.education[0].school, "Example University");
  assert.match(r.education[0].degree, /Bachelor/);
  assert.equal(r.skills.flatMap((g) => g.items).length, 6);
  assert.equal(r.projects[0].name, "Budget Tracker");
  assert.equal(r.certifications.length, 1);
  assert.equal(r.meta.imported.text, RESUME_TEXT);
});

test("preserves ambiguous text and does not invent months", () => {
  const r = parseResumeText("Alex Morgan\nWork Experience\nEngineer | Example\n2020 - 2023\n- Built services.");
  assert.equal(r.experience[0].start, "");
  assert.equal(r.experience[0].end, "");
  assert.match(r.meta.imported.unassigned, /2020 - 2023/);
  assert.equal(parseImportDate("02/2023"), "2023-02");
  assert.equal(parseImportDate("2023-13"), "");
  assert.equal(parseImportDate("2023"), "");
  assert.equal(parseImportDate("Madeup 2023"), "");
});

test("keeps unsupported sections for review instead of labelling them as skills", () => {
  const r = parseResumeText("Alex Morgan\nSkills\nSQL, Python\nLanguages\nEnglish, French\nInterests\nCycling");
  assert.deepEqual(r.skills[0].items, ["SQL", "Python"]);
  assert.match(r.meta.imported.unassigned, /English, French/);
  assert.match(r.meta.imported.unassigned, /Cycling/);
});

test("rejects unsupported, empty, oversized and fake files", () => {
  assert.throws(() => validateResumeFile({ name: "resume.doc", size: 20 }));
  assert.throws(() => validateResumeFile({ name: "resume.txt", size: 0 }));
  assert.throws(() => validateResumeFile({ name: "resume.pdf", size: MAX_FILE_BYTES + 1 }));
  assert.throws(() => validateDocxArchive(new ArrayBuffer(10)));
  assert.equal(validateResumeFile({ name: "RESUME.PDF", size: 200 }), "pdf");
});

test("accepts DOCX document text and refuses oversized compressed XML", async () => {
  const good = await new JSZip().file("word/document.xml", "<document>Resume text</document>").generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  assert.match(await readDocxXml(good, new AbortController().signal), /Resume text/);
  const huge = await new JSZip().file("word/document.xml", "x".repeat(2 * 1024 * 1024 + 1)).generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  assert.throws(() => validateDocxArchive(huge));
  // Even a forged central directory cannot bypass the streaming size limit.
  const view = new DataView(huge);
  for (let offset = 0; offset < huge.byteLength - 46; offset++) if (view.getUint32(offset, true) === 0x02014b50) { view.setUint32(offset + 24, 1, true); break; }
  await assert.rejects(readDocxXml(huge, new AbortController().signal), /too large/);
});

test("reads PDFs when native iterator helpers are missing on mobile browsers", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { loadPdfJs } from "./src/lib/pdf.ts";
    globalThis.Iterator = undefined;
    globalThis.DOMMatrix = class DOMMatrix {};
    globalThis.Path2D = class Path2D {};
    await assert.rejects(import("pdfjs-dist/build/pdf.mjs"), /prototype|Iterator/);
    const pdfjs = await loadPdfJs();
    assert.equal(typeof Iterator, "function");
    assert.match(pdfjs.GlobalWorkerOptions.workerSrc, /pdf.worker.legacy.min.mjs$/);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).href;
    const task = pdfjs.getDocument({data: Uint8Array.from(Buffer.from(process.argv[1], "base64"))});
    try {
      const doc = await task.promise;
      const content = await (await doc.getPage(1)).getTextContent();
      assert.match(content.items.map(item => item.str ?? "").join(" "), /John Doe.*Python SQL/);
    } finally { await task.destroy(); }
  `, Buffer.from(resumePdf()).toString("base64")], { encoding: "utf8", timeout: 15000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
