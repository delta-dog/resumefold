import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resilientStorage, type StorageIssue } from "../src/lib/storage";
import { containsKeyword, keywordMatch, suggestKeywords } from "../src/lib/ats/check";
import { emptyResume, parseResume } from "../src/lib/schema";

test("matches whole terms, punctuation, phrases and common abbreviations", () => {
  assert.equal(containsKeyword("JavaScript PostgreSQL C++ C#", "Java"), false);
  assert.equal(containsKeyword("JavaScript PostgreSQL C++ C#", "SQL"), false);
  assert.equal(containsKeyword("C++ and C#", "C"), false);
  assert.equal(containsKeyword("Python, C++, C# and Node.js.", "Node.js"), true);
  assert.equal(containsKeyword("Python, C++, C# and Node.js.", "C++"), true);
  assert.equal(containsKeyword("Hands-on machine-learning and AWS", "machine learning"), true);
  assert.equal(containsKeyword("AWS cloud services", "Amazon Web Services"), true);
  assert.equal(containsKeyword("Experienced in customer\nservice.", "customer service"), true);
});

test("suggests only posting terms and respects explicit keywords and source", () => {
  const posting = "Required: Python, SQL and machine learning. Build data pipelines for our company.";
  const terms = suggestKeywords(posting);
  assert.ok(terms.includes("Python"));
  assert.ok(terms.includes("SQL"));
  assert.ok(terms.includes("machine learning"));
  assert.ok(!terms.includes("React"));
  const r = emptyResume(); r.skills = [{ id: "s1", category: "Skills", items: ["Python"] }];
  const report = keywordMatch(posting, r, "Python, SQL, SQL, customer service");
  assert.deepEqual(report?.matched, ["Python"]);
  assert.deepEqual(report?.missing, ["SQL", "customer service"]);
  assert.deepEqual(keywordMatch("", r, "SQL", "Used SQL for reporting.")?.matched, ["SQL"]);
  assert.equal(keywordMatch("", r), null);
  r.meta.analysis.keywords = "React";
  assert.deepEqual(keywordMatch("", r, "React")?.missing, ["React"]);
});

test("old resumes get defaults and analysis survives JSON backup", () => {
  const old = parseResume({ contact: { fullName: "Alex Morgan" }, meta: { template: "standard" } });
  assert.equal(old.meta.analysis.jobDescription, "");
  old.meta.analysis = { jobTitle: "Data analyst", company: "Example", jobDescription: "SQL and financial reporting", keywords: "SQL, financial reporting", source: "draft" };
  assert.deepEqual(parseResume(JSON.parse(JSON.stringify(old))).meta.analysis, old.meta.analysis);
});

test("resume exports exclude job targets and original upload metadata", async () => {
  const { renderDocx } = await import("../src/lib/export/docx");
  const { latexForExport } = await import("../src/lib/latex/source");
  const { default: JSZip } = await import("jszip");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { ResumeDocument } = await import("../src/lib/templates/html/ResumeDocument");
  const { wrapPrintHtml } = await import("../src/lib/export/html");
  const r = emptyResume();
  r.contact.fullName = "Alex Morgan";
  r.skills = [{ id: "s1", category: "Tools", items: ["Python", "SQL"] }];
  r.meta.analysis.jobDescription = "PRIVATE_JOB_TARGET_SENTINEL";
  r.meta.analysis.keywords = "SECRET_KEYWORD_SENTINEL";
  r.meta.imported.text = "ORIGINAL_TEXT_SENTINEL";
  const blob = await renderDocx(r);
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  const latex = latexForExport(r).files["resume.tex"];
  const printable = wrapPrintHtml(renderToStaticMarkup(createElement(ResumeDocument, { resume: r })), "letter", "Resume");
  for (const text of [xml, latex, printable]) {
    assert.match(text, /Alex Morgan/);
    assert.match(text, /Python/);
    assert.match(text, /SQL/);
    assert.ok(!/PRIVATE_JOB_TARGET|SECRET_KEYWORD|ORIGINAL_TEXT_SENTINEL/.test(text));
  }
  r.summary = "Delivered <script>unsafe()</script> results";
  const escaped = renderToStaticMarkup(createElement(ResumeDocument, { resume: r }));
  assert.ok(!escaped.includes("<script>"));
  assert.ok(escaped.includes("&lt;script&gt;"));
});

test("analysis survives draft changes, duplication and storage rehydration", async () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
  const { useResumeStore: store } = await import("../src/lib/store");
  const initialId = store.getState().activeId;
  store.getState().update((r) => { r.meta.analysis.jobDescription = "Python and SQL developer"; r.meta.analysis.keywords = "Python, SQL"; });
  const otherId = store.getState().newDraft();
  assert.equal(store.getState().drafts[otherId].resume.meta.analysis.jobDescription, "");
  store.getState().setActive(initialId);
  assert.equal(store.getState().drafts[initialId].resume.meta.analysis.keywords, "Python, SQL");
  const copyId = store.getState().duplicateDraft(initialId);
  assert.equal(store.getState().drafts[copyId].resume.meta.analysis.jobDescription, "Python and SQL developer");
  await store.persist.rehydrate();
  assert.equal(store.getState().drafts[copyId].resume.meta.analysis.keywords, "Python, SQL");
});

test("blocked storage and storage quota failures keep current drafts in memory", () => {
  const issues: StorageIssue[] = [];
  const blocked = resilientStorage(() => { throw new Error("Storage blocked"); }, (issue) => issues.push(issue));
  assert.equal(blocked.getItem("draft"), null);
  blocked.setItem("draft", '{"name":"John Doe"}');
  assert.equal(blocked.getItem("draft"), '{"name":"John Doe"}');
  assert.deepEqual(issues, ["unavailable"]);
  const full = resilientStorage(() => ({ getItem: () => null, setItem: () => { throw new DOMException("Full", "QuotaExceededError"); }, removeItem: () => {} }), (issue) => issues.push(issue));
  full.setItem("draft", '{"keywords":"SQL"}');
  assert.equal(full.getItem("draft"), '{"keywords":"SQL"}');
  assert.equal(issues.at(-1), "full");
});

test("corrupt stored JSON is preserved while new changes use memory", () => {
  let original = "broken JSON";
  const issues: StorageIssue[] = [];
  const storage = resilientStorage(() => ({ getItem: () => original, setItem: (_, value) => { original = value; }, removeItem: () => { original = ""; } }), (issue) => issues.push(issue));
  assert.equal(storage.getItem("draft"), null);
  storage.setItem("draft", '{"name":"John Doe"}');
  assert.equal(storage.getItem("draft"), '{"name":"John Doe"}');
  assert.equal(original, "broken JSON");
  assert.deepEqual(issues, ["unreadable"]);
});

test("the editor finishes hydration when browser storage access throws", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    globalThis.window = {};
    Object.defineProperty(globalThis, "localStorage", { get() { throw new Error("Storage blocked"); } });
    const { useResumeStore: store } = await import("./src/lib/store.ts");
    assert.equal(store.getState().hydrated, true);
    store.getState().update(r => { r.meta.analysis.keywords = "SQL"; });
    const state = store.getState();
    assert.equal(state.drafts[state.activeId].resume.meta.analysis.keywords, "SQL");
  `], { encoding: "utf8", timeout: 10000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
