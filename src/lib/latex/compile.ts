"use client";

/**
 * Compile LaTeX entirely from the browser.
 *
 * Backend: LaTeX-On-HTTP (https://github.com/YtoTech/latex-on-http), a public
 * TeX Live service with proper CORS. On success it answers with the PDF; on
 * failure with JSON that includes the full .log, which our parser turns into
 * line-numbered errors.
 *
 * The source leaves the user's machine, so callers must get consent first.
 * Swap `COMPILE_SERVICE.url` for a self-hosted instance if you want it private.
 */
export type Engine = "pdflatex" | "xelatex" | "lualatex";

export type CompileResult =
  | { ok: true; pdf: ArrayBuffer; ms: number }
  | { ok: false; log: string; ms: number };

export const COMPILE_SERVICE = {
  name: "LaTeX-On-HTTP",
  host: "latex.ytotech.com",
  url: "https://latex.ytotech.com/builds/sync",
  source: "https://github.com/YtoTech/latex-on-http",
};

export async function compileLatex(
  files: Record<string, string>,
  main: string,
  engine: Engine = "pdflatex",
  signal?: AbortSignal,
): Promise<CompileResult> {
  const t0 = performance.now();
  const resources = [
    { main: true, content: files[main] },
    ...Object.entries(files)
      .filter(([name]) => name !== main && !name.endsWith(".md"))
      .map(([path, content]) => ({ path, content })),
  ];
  const body = {
    compiler: engine,
    resources,
    options: {
      compiler: { halt_on_error: true },
      response: { log_files_on_failure: true },
    },
  };

  const res = await fetch(COMPILE_SERVICE.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const ms = Math.round(performance.now() - t0);
  const type = res.headers.get("content-type") ?? "";

  if (res.ok && type.includes("pdf")) return { ok: true, pdf: await res.arrayBuffer(), ms };

  let log = "";
  if (type.includes("json")) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; log_files?: Record<string, string>; message?: string };
    const logs = j.log_files ? Object.values(j.log_files) : [];
    log = logs.join("\n\n") || j.message || j.error || `HTTP ${res.status}`;
  } else {
    log = `HTTP ${res.status}\n${await res.text()}`;
  }
  return { ok: false, log, ms };
}
