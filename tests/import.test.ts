import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { spawnSync } from "node:child_process";
import { resumePdf } from "./pdf-fixture";
import { installPdfCompatibility } from "../src/lib/pdf-compat.mjs";
import { parseImportDate, parseResumeText } from "../src/lib/import/parse";
import { MAX_FILE_BYTES, extractResumeText, readDocxXml, readFileBytes, validateResumeFile, validateDocxArchive } from "../src/lib/import/extract";
import { ResumeReadError } from "../src/lib/import/errors";

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

test("preserves native PDF compatibility APIs", () => {
  const resolvers = Promise.withResolvers;
  const transfer = ArrayBuffer.prototype.transferToFixedLength;
  installPdfCompatibility();
  if (typeof resolvers === "function") assert.equal(Promise.withResolvers, resolvers);
  if (typeof transfer === "function") assert.equal(ArrayBuffer.prototype.transferToFixedLength, transfer);
  assert.equal(typeof Promise.withResolvers, "function");
  assert.equal(typeof ArrayBuffer.prototype.transferToFixedLength, "function");
});

test("retains useful failure stages and distinguishes invalid text from compatibility errors", async () => {
  await assert.rejects(extractResumeText(new File([new Uint8Array([0xff, 0xfe, 0xff])], "resume.txt"), new AbortController().signal), (error: unknown) => {
    assert.ok(error instanceof ResumeReadError);
    assert.match(error.message, /UTF-8/);
    assert.match(error.diagnostic, /^text-decode: TypeError:/);
    return true;
  });
  await assert.rejects(extractResumeText(new File(["A file pretending to be a PDF."], "resume.pdf"), new AbortController().signal), (error: unknown) => {
    assert.ok(error instanceof ResumeReadError);
    assert.match(error.message, /not a valid PDF/);
    assert.match(error.diagnostic, /^pdf-load:/);
    return true;
  });
});

test("reads actual PDF uploads without Safari 17.4+ APIs in the page and isolated worker", () => {
  const copied = spawnSync(process.execPath, ["scripts/copy-pdf-worker.mjs"], { encoding: "utf8" });
  assert.equal(copied.status, 0, copied.stderr);
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { Worker } from "node:worker_threads";
    import { loadPdfJs } from "./src/lib/pdf.ts";
    import { extractResumeText } from "./src/lib/import/extract.ts";
    globalThis.Iterator = undefined;
    Promise.withResolvers = undefined;
    ArrayBuffer.prototype.transferToFixedLength = undefined;
    URL.parse = undefined;
    globalThis.DOMMatrix = class DOMMatrix {};
    globalThis.Path2D = class Path2D {};
    const pdfjs = await loadPdfJs();
    assert.equal(typeof Iterator, "function");
    const capability = Promise.withResolvers();
    capability.resolve(42); assert.equal(await capability.promise, 42);
    class SubPromise extends Promise {};
    assert.ok(SubPromise.withResolvers().promise instanceof SubPromise);
    const rejected = Promise.withResolvers(); rejected.reject(new Error("rejected"));
    await assert.rejects(rejected.promise, /rejected/);
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    assert.deepEqual([...new Uint8Array(buffer.transferToFixedLength(5))], [1, 2, 3, 0, 0]);
    assert.equal(buffer.byteLength, 0);
    assert.throws(() => buffer.transferToFixedLength(), TypeError);
    assert.throws(() => new ArrayBuffer(1).transferToFixedLength(-1), RangeError);
    const workerUrl = new URL("./public" + pdfjs.GlobalWorkerOptions.workerSrc, import.meta.url).href;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const file = new File([Buffer.from(process.argv[1], "base64")], "resume.pdf", {type:"application/pdf"});
    const text = await extractResumeText(file, new AbortController().signal);
    assert.match(text.replace(/\\s+/g," "), /John Doe.*Python SQL/);
    const worker = new Worker(
      'const {parentPort} = require("node:worker_threads");' +
      'Promise.withResolvers = undefined; ArrayBuffer.prototype.transferToFixedLength = undefined; globalThis.Iterator = undefined;' +
      'import(' + JSON.stringify(workerUrl) + ').then(module => {' +
      'const buffer = new Uint8Array([7,8]).buffer; const moved = buffer.transferToFixedLength(1);' +
      'parentPort.postMessage({resolvers:typeof Promise.withResolvers,handler:typeof module.WorkerMessageHandler,byte:new Uint8Array(moved)[0],detached:buffer.byteLength});' +
      '}).catch(error => {throw error;});', {eval:true, execArgv:[]});
    const workerResult = await new Promise((resolve,reject) => {worker.once("message",resolve);worker.once("error",reject);});
    assert.deepEqual(workerResult, {resolvers:"function",handler:"function",byte:7,detached:0});
    await worker.terminate();
  `, Buffer.from(resumePdf()).toString("base64")], { encoding: "utf8", timeout: 15000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("reads native file-picker bytes and cleans up cancellation and provider failures", async () => {
  const Original = globalThis.FileReader;
  const readers: Reader[] = [];
  const latest = () => readers[readers.length - 1];
  class Reader {
    result: ArrayBuffer | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    aborted = false;
    constructor() { readers.push(this); }
    readAsArrayBuffer() {}
    abort() { this.aborted = true; this.onabort?.(); }
  }
  globalThis.FileReader = Reader as unknown as typeof FileReader;
  try {
    const file = new File(["resume"], "resume.txt");
    const success = readFileBytes(file, new AbortController().signal);
    latest().result = new Uint8Array([1, 2]).buffer; latest().onload!();
    assert.deepEqual([...new Uint8Array(await success)], [1, 2]);
    assert.equal(latest().onload, null);
    const request = new AbortController();
    const cancelled = readFileBytes(file, request.signal); request.abort(new Error("cancelled"));
    await assert.rejects(cancelled, /cancelled/); assert.equal(latest().aborted, true);
    assert.equal(latest().onload, null);
    const failed = readFileBytes(file, new AbortController().signal); latest().onerror!();
    await assert.rejects(failed, /Download it to your device/);
    const aborted = new AbortController(); aborted.abort(new Error("already cancelled"));
    assert.throws(() => readFileBytes(file, aborted.signal), /already cancelled/);
  } finally { globalThis.FileReader = Original; }
});
