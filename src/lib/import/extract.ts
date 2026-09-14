import { loadPdfJs } from "@/lib/pdf";
import { ResumeReadError, type ImportStage } from "./errors";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TEXT_LENGTH = 100000;
const MAX_XML_BYTES = 2 * 1024 * 1024;
function checkAborted(signal: AbortSignal) {
  if (signal.aborted) throw signal.reason ?? new Error("Reading cancelled.");
}

export function readFileBytes(file: File, signal: AbortSignal): Promise<ArrayBuffer> {
  checkAborted(signal);
  if (typeof FileReader === "undefined") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => { signal.removeEventListener("abort", abort); reader.onload = reader.onerror = reader.onabort = null; };
    const abort = () => { cleanup(); reader.abort(); reject(signal.reason ?? new Error("Reading cancelled.")); };
    reader.onload = () => {
      const result = reader.result;
      cleanup();
      if (result instanceof ArrayBuffer) resolve(result);
      else reject(new Error("No file data was received. Choose the file again."));
    };
    reader.onerror = () => { cleanup(); reject(new Error("The file could not be opened. Download it to your device, then choose it again.")); };
    reader.onabort = () => { cleanup(); reject(new Error("Reading cancelled.")); };
    signal.addEventListener("abort", abort, { once: true });
    try { reader.readAsArrayBuffer(file); } catch (error) { cleanup(); reject(error); }
  });
}
type DocxStream = {
  on(event: "data", callback: (chunk: Uint8Array) => void): DocxStream;
  on(event: "error", callback: (error: unknown) => void): DocxStream;
  on(event: "end", callback: () => void): DocxStream;
  pause(): DocxStream;
  resume(): DocxStream;
};

export async function readDocxXml(buffer: ArrayBuffer, signal: AbortSignal) {
  validateDocxArchive(buffer);
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  checkAborted(signal);
  const entry = zip.file("word/document.xml")!;
  const stream = (entry as typeof entry & { internalStream(type: "uint8array"): DocxStream }).internalStream("uint8array");
  return new Promise<string>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0, finished = false;
    const fail = (error: unknown) => {
      if (finished) return;
      finished = true; stream.pause(); chunks.length = 0;
      signal.removeEventListener("abort", abort);
      reject(error);
    };
    const abort = () => fail(new Error("Reading cancelled."));
    signal.addEventListener("abort", abort, { once: true });
    stream.on("data", (chunk: Uint8Array) => {
      if (finished) return;
      size += chunk.length;
      if (size > MAX_XML_BYTES) fail(new Error("The DOCX document is too large."));
      else chunks.push(chunk);
    }).on("error", fail).on("end", () => {
      if (finished) return;
      finished = true;
      signal.removeEventListener("abort", abort);
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      try { resolve(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch (error) { reject(error); }
    });
    stream.resume();
  });
}

export function validateResumeFile(file: Pick<File, "name" | "size">) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["pdf", "docx", "txt"].includes(extension)) throw new Error("Choose a PDF, DOCX or TXT file. Older .doc files need to be saved as DOCX first.");
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Choose a file smaller than 5 MB.");
  return extension;
}

function checkText(text: string) {
  const cleaned = text.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
  if (cleaned.length > MAX_TEXT_LENGTH) throw new Error("This document has too much text. Choose a shorter resume.");
  if (cleaned.length < 20) throw new Error("No readable resume text was found. Scanned PDFs and images need to be converted to selectable text first.");
  return cleaned;
}

// Check the central directory before inflating XML, including ZIP64/encrypted archives.
export function validateDocxArchive(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  let end = -1;
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === view.byteLength) { end = i; break; }
  }
  if (end < 0) throw new Error("This is not a valid DOCX file.");
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  if (count > 4000 || cursor === 0xffffffff || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error("This DOCX archive is too complex. Save a simpler copy or use TXT.");
  let found = false;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("This DOCX archive is damaged.");
    const nameLength = view.getUint16(cursor + 28, true);
    const next = cursor + 46 + nameLength + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
    if (next > end) throw new Error("This DOCX archive is damaged.");
    const name = new TextDecoder().decode(new Uint8Array(buffer, cursor + 46, nameLength));
    if (name === "word/document.xml") {
      if (found || view.getUint16(cursor + 8, true) & 1 || view.getUint32(cursor + 24, true) > MAX_XML_BYTES) throw new Error("The DOCX text is encrypted or too large. Save a simpler copy.");
      found = true;
    }
    cursor = next;
  }
  if (!found) throw new Error("This DOCX file has no document text.");
}

function docxText(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("This DOCX contains unsupported XML declarations.");
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("This DOCX document is damaged.");
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  return Array.from(document.getElementsByTagNameNS(ns, "p")).map((paragraph) => {
    let line = "";
    for (const node of Array.from(paragraph.getElementsByTagNameNS(ns, "*"))) {
      let parent = node.parentElement;
      while (parent && !(parent.namespaceURI === ns && parent.localName === "p")) parent = parent.parentElement;
      if (parent !== paragraph) continue;
      if (node.localName === "t") line += node.textContent ?? "";
      else if (node.localName === "tab") line += "\t";
      else if (["br", "cr"].includes(node.localName)) line += "\n";
    }
    return paragraph.getElementsByTagNameNS(ns, "numPr").length ? `- ${line}` : line;
  }).join("\n");
}

export async function extractResumeText(file: File, signal: AbortSignal): Promise<string> {
  const extension = validateResumeFile(file);
  let stage: ImportStage = "file-read";
  try {
    const buffer = await readFileBytes(file, signal);
    checkAborted(signal);
    if (extension === "txt") { stage = "text-decode"; return checkText(new TextDecoder("utf-8", { fatal: true }).decode(buffer)); }
    if (extension === "docx") {
      stage = "docx-read";
      const xml = await readDocxXml(buffer, signal);
      checkAborted(signal);
      return checkText(docxText(xml));
    }
    stage = "pdf-load";
    if (new TextDecoder().decode(buffer.slice(0, 5)) !== "%PDF-") throw new Error("This is not a valid PDF file.");
    const pdfjs = await loadPdfJs();
    checkAborted(signal);
    const task = pdfjs.getDocument({ data: buffer, useSystemFonts: false });
    const abort = () => { void task.destroy().catch(() => {}); };
    signal.addEventListener("abort", abort, { once: true });
    try {
      const pdf = await task.promise;
      stage = "pdf-text";
      if (pdf.numPages > 20) throw new Error("Choose a resume with no more than 20 pages.");
      const pages: string[] = [];
      let length = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        checkAborted(signal);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const lines: string[] = [];
        let line = "";
        let y: number | null = null;
        for (const item of content.items) {
          if (!("str" in item)) continue;
          const nextY = item.transform[5];
          if (y !== null && Math.abs(nextY - y) > 3 && line.trim()) { lines.push(line.trim()); line = ""; }
          line += `${line && !line.endsWith(" ") ? " " : ""}${item.str}`;
          y = nextY;
          if (item.hasEOL) { lines.push(line.trim()); line = ""; y = null; }
        }
        if (line.trim()) lines.push(line.trim());
        const text = lines.join("\n");
        length += text.length;
        if (length > MAX_TEXT_LENGTH) throw new Error("This PDF has too much text. Choose a shorter resume.");
        pages.push(text);
        page.cleanup();
      }
      return checkText(pages.join("\n\n"));
    } catch (error) {
      if (error instanceof Error && error.name === "PasswordException") throw new Error("This PDF is password-protected. Upload an unlocked copy.");
      throw error;
    } finally {
      signal.removeEventListener("abort", abort);
      await task.destroy().catch(() => {});
    }
  } catch (error) {
    if (signal.aborted) throw signal.reason ?? new Error("Reading cancelled.");
    throw new ResumeReadError(stage, error);
  }
}
