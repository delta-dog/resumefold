"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useActiveResume, useResumeStore } from "@/lib/store";
import { parseResumeText } from "@/lib/import/parse";
import { ResumeReadError } from "@/lib/import/errors";
import type { ImportProgress } from "@/lib/import/extract";

type UploadState =
  | { kind: "choose" }
  | { kind: "reading"; filename: string; progress: ImportProgress }
  | { kind: "review"; filename: string; text: string }
  | { kind: "paste" }
  | { kind: "error"; filename: string; message: string; diagnostic: string };

export function ResumeUpload({ onImported }: { onImported: () => void }) {
  const current = useActiveResume();
  const importDraft = useResumeStore((s) => s.importDraft);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const controller = useRef<AbortController | null>(null);
  const lastFile = useRef<File | null>(null);
  const [state, setState] = useState<UploadState>({ kind: "choose" });
  const previousKind = useRef(state.kind);
  const [pasted, setPasted] = useState("");
  const parsed = useMemo(() => state.kind === "review" ? parseResumeText(state.text, state.filename) : null, [state]);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; lastFile.current = null; }, []);
  useEffect(() => {
    if (previousKind.current === state.kind) return;
    previousKind.current = state.kind;
    if (state.kind !== "reading") {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, [state.kind]);

  const reset = () => {
    controller.current?.abort(); controller.current = null;
    lastFile.current = null; setState({ kind: "choose" });
  };

  const read = async (file: File) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request; lastFile.current = file;
    setState({ kind: "reading", filename: file.name, progress: { label: "Opening file…" } });
    const timeout = setTimeout(() => request.abort(new Error("Reading timed out. Try a smaller file or paste its text.")), 45000);
    try {
      const { extractResumeText } = await import("@/lib/import/extract");
      const text = await extractResumeText(file, request.signal, (progress) => {
        if (controller.current === request && !request.signal.aborted) setState({ kind: "reading", filename: file.name, progress });
      });
      if (controller.current === request && !request.signal.aborted) setState({ kind: "review", filename: file.name, text });
    } catch (error) {
      if (controller.current === request) setState({ kind: "error", filename: file.name,
        message: request.signal.aborted ? "Reading timed out. Try a smaller file or paste its text." : error instanceof Error ? error.message : "This file could not be read.",
        diagnostic: error instanceof ResumeReadError ? error.diagnostic : "",
      });
    } finally {
      clearTimeout(timeout);
      if (controller.current === request) controller.current = null;
    }
  };

  const chooseFile = () => input.current?.click();
  const heading = state.kind === "review" ? "Check your resume" : state.kind === "paste" ? "Paste your resume" : "Import your resume";
  return (
    <section className="tile grid min-w-0 gap-3 p-4 sm:p-5" aria-labelledby={`${id}-title`}>
      <div>
        <h2 ref={headingRef} tabIndex={-1} id={`${id}-title`} className="scroll-mt-4 font-display text-md font-bold outline-none">{heading}</h2>
        <p className="mt-1 text-xs text-ink-3">PDF, DOCX or TXT · up to 5 MB · stays on this device</p>
      </div>
      <input ref={input} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" aria-label="Resume file" onChange={(event) => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (file) void read(file);
      }} />

      {state.kind === "choose" && <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={chooseFile}>Upload a resume</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setState({ kind: "paste" })}>Paste text</button>
      </div>}

      {state.kind === "reading" && <div className="grid gap-2">
        <p className="break-all text-sm">{state.filename}</p>
        <p role="status" aria-live="polite" className="text-sm text-ink-2">{state.progress.label}</p>
        <progress className="h-2 w-full accent-[var(--ink)]" aria-label="Resume reading progress" max={state.progress.totalPages ?? 1} value={state.progress.page ? state.progress.page - 1 : undefined} />
        <button type="button" className="btn btn-secondary btn-sm justify-self-start" onClick={reset}>Cancel</button>
      </div>}

      {state.kind === "error" && <div className="grid min-w-0 gap-3">
        <p className="break-all text-xs text-ink-3">{state.filename}</p>
        <p role="alert" className="text-sm text-danger">{state.message}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { if (lastFile.current) void read(lastFile.current); else chooseFile(); }}>Try again</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={chooseFile}>Change file</button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={() => setState({ kind: "paste" })}>Paste text instead</button>
        {state.diagnostic && <details className="min-w-0 text-xs text-ink-3">
          <summary className="flex min-h-11 cursor-pointer items-center">Error details</summary>
          <p className="break-words">{state.diagnostic}</p>
        </details>}
      </div>}

      {state.kind === "paste" && <div className="grid gap-3">
        <label htmlFor={`${id}-paste`} className="text-sm text-ink-2">Copy the text from your resume.</label>
        <textarea id={`${id}-paste`} aria-label="Resume text" className="field" rows={6} maxLength={100000} value={pasted} onChange={(event) => setPasted(event.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary btn-sm" disabled={pasted.trim().length < 20} onClick={() => {
            setState({ kind: "review", filename: "Pasted resume.txt", text: pasted.trim() }); setPasted(""); lastFile.current = null;
          }}>Check text</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>Back</button>
        </div>
      </div>}

      {state.kind === "review" && parsed && <div className="grid min-w-0 gap-3">
        <p className="break-all text-xs text-ink-3">{state.filename}</p>
        <p role="status" className="text-sm">{parsed.contact.fullName || "Check your name"} · {parsed.experience.length} roles · {parsed.skills.reduce((n, group) => n + group.items.length, 0)} skills</p>
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">View and edit extracted text</summary>
          <textarea aria-label="Extracted resume text" className="field mt-2" rows={7} maxLength={100000} value={state.text} onChange={(event) => setState({ ...state, text: event.target.value })} />
        </details>
        <p className="text-xs text-ink-3">Creates a new draft. Your existing draft and job target are kept.</p>
        <button type="button" className="btn btn-primary w-full" disabled={state.text.trim().length < 20} onClick={() => {
          const imported = structuredClone(parsed);
          imported.meta.analysis = structuredClone(current.meta.analysis);
          importDraft(imported, imported.contact.fullName || state.filename.replace(/\.[^.]+$/, ""));
          reset(); onImported();
        }}>Continue to review</button>
        <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={reset}>Use another resume</button>
      </div>}
    </section>
  );
}
