import type { PDFPageProxy } from "pdfjs-dist";

// Safari's stream reader is supported much earlier than stream async iteration.
export async function readPdfPageText(page: Pick<PDFPageProxy, "streamTextContent">, signal: AbortSignal, maxLength: number) {
  if (signal.aborted) throw signal.reason ?? new Error("Reading cancelled.");
  const reader = page.streamTextContent().getReader();
  const lines: string[] = [];
  let line = "", y: number | null = null, length = 0, complete = false;
  const abort = () => { void reader.cancel(signal.reason).catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  const finishLine = () => {
    if (line.trim()) { lines.push(line.trim()); length++; }
    line = ""; y = null;
  };
  try {
    while (true) {
      const chunk = await reader.read();
      if (signal.aborted) throw signal.reason ?? new Error("Reading cancelled.");
      if (chunk.done) { complete = true; break; }
      for (const item of chunk.value.items) {
        if (!("str" in item)) continue;
        const nextY = item.transform[5];
        if (y !== null && Math.abs(nextY - y) > 3) finishLine();
        const separator = line && !line.endsWith(" ") ? " " : "";
        length += separator.length + item.str.length;
        if (length > maxLength) throw new Error("This PDF has too much text. Choose a shorter resume.");
        line += separator + item.str;
        y = nextY;
        if (item.hasEOL) finishLine();
      }
    }
    finishLine();
    const text = lines.join("\n");
    if (text.length > maxLength) throw new Error("This PDF has too much text. Choose a shorter resume.");
    return text;
  } finally {
    signal.removeEventListener("abort", abort);
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
