"use client";

/**
 * Client side of the in-browser TeX engine (public/tex/tex-worker.js).
 * The bundle is optional: if scripts/tex/build-bundle.mjs hasn't been run,
 * `localTexAvailable()` resolves false and the studio offers the remote service.
 */
import type { CompileResult } from "./compile";

const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/tex/`;

export type LocalProgress =
  | { kind: "status"; text: string }
  | { kind: "download"; file: string; loaded: number; total: number };

let worker: Worker | null = null;
let readyPromise: Promise<string> | null = null;
let seq = 0;
const pending = new Map<number, (r: CompileResult | { error: string }) => void>();
const progressListeners = new Set<(p: LocalProgress) => void>();

let availability: Promise<boolean> | null = null;
/** True when the bundle files are deployed alongside the site. Cached per session. */
export function localTexAvailable(): Promise<boolean> {
  if (!availability) {
    availability = fetch(`${BASE}bundle.json`, { method: "HEAD" })
      .then((r) => r.ok)
      .catch(() => false);
  }
  return availability;
}

export function onLocalProgress(fn: (p: LocalProgress) => void): () => void {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(`${BASE}tex-worker.js`);
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "progress") progressListeners.forEach((f) => f({ kind: "download", file: m.file, loaded: m.loaded, total: m.total }));
    else if (m.type === "status") progressListeners.forEach((f) => f({ kind: "status", text: m.text }));
    else if (m.type === "result") pending.get(m.id)?.(m);
    else if (m.type === "error") {
      if (m.id != null) pending.get(m.id)?.({ error: m.message });
      else readyReject?.(new Error(m.message));
    } else if (m.type === "ready") readyResolve?.(m.version);
  };
  worker.onerror = (e) => {
    readyReject?.(new Error(e.message));
    for (const [, cb] of pending) cb({ error: e.message });
    pending.clear();
  };
  return worker;
}

let readyResolve: ((v: string) => void) | null = null;
let readyReject: ((e: Error) => void) | null = null;

/** Download (once) and prepare the engine. Safe to call repeatedly. */
export function warmLocalTex(): Promise<string> {
  if (!readyPromise) {
    readyPromise = new Promise<string>((res, rej) => {
      readyResolve = res;
      readyReject = rej;
      getWorker().postMessage({ type: "init" });
    }).catch((e) => {
      readyPromise = null;
      throw e;
    });
  }
  return readyPromise;
}

export async function compileLocal(files: Record<string, string>, main: string): Promise<CompileResult> {
  await warmLocalTex();
  const t0 = performance.now();
  const id = ++seq;
  const r = await new Promise<CompileResult | { error: string }>((resolve) => {
    pending.set(id, (x) => {
      pending.delete(id);
      resolve(x as CompileResult | { error: string });
    });
    getWorker().postMessage({ type: "compile", id, files, main });
  });
  const ms = Math.round(performance.now() - t0);
  if ("error" in r) return { ok: false, log: r.error, ms };
  if (r.ok) return { ok: true, pdf: (r.pdf as unknown as Uint8Array).buffer as ArrayBuffer, ms };
  return { ok: false, log: r.log, ms };
}
