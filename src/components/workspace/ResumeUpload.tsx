"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveResume, useResumeStore } from "@/lib/store";
import { parseResumeText } from "@/lib/import/parse";

export function ResumeUpload({ onImported }: { onImported: () => void }) {
  const current = useActiveResume();
  const importDraft = useResumeStore((s) => s.importDraft);
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [text, setText] = useState("");
  const parsed = useMemo(() => text ? parseResumeText(text, filename) : null, [text, filename]);
  useEffect(() => () => { controller.current?.abort(); controller.current = null; }, []);

  const read = async (file: File) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true); setError(""); setText(""); setFilename(file.name);
    const timeout = setTimeout(() => request.abort(new Error("Reading took too long. Try DOCX or TXT.")), 30000);
    try {
      const { extractResumeText } = await import("@/lib/import/extract");
      const extracted = await extractResumeText(file, request.signal);
      if (!request.signal.aborted) setText(extracted);
    } catch (error) {
      if (controller.current === request) setError(request.signal.aborted ? "Reading cancelled or timed out. Try a smaller file, DOCX or TXT." : error instanceof TypeError || error instanceof ReferenceError ? "This browser could not read the file. Try a DOCX or TXT copy, or update your browser." : error instanceof Error ? error.message : "This file could not be read.");
    } finally {
      clearTimeout(timeout);
      if (controller.current === request) setBusy(false);
    }
  };

  return (
    <section className="tile grid gap-3 p-4 sm:p-5" aria-labelledby="upload-resume-title">
      <div>
        <h2 id="upload-resume-title" className="font-display text-md font-bold">Have a resume already?</h2>
        <p className="mt-1 text-sm text-ink-2">Upload it, check the extracted details, and compare it with a job posting.</p>
        <p className="mt-2 text-xs text-ink-3">PDF, DOCX or TXT · up to 5 MB · stays on this device</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Reading resume…" : "Upload a resume"}</button>
        {busy && <button type="button" className="btn btn-ghost btn-sm" onClick={() => controller.current?.abort()}>Cancel</button>}
      </div>
      <input ref={input} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" aria-label="Resume file" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void read(file);
      }} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {parsed && (
        <div className="grid min-w-0 gap-3">
          <p className="break-all text-sm font-medium">{filename}</p>
          <p className="text-sm text-ink-2">{parsed.contact.fullName || "Name needs checking"} · {parsed.experience.length} roles · {parsed.education.length} education entries · {parsed.skills.reduce((n, group) => n + group.items.length, 0)} skills</p>
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Check extracted text</summary>
            <textarea aria-label="Extracted resume text" className="field mt-2" rows={8} value={text} maxLength={100000} onChange={(event) => setText(event.target.value)} />
          </details>
          <p className="text-xs text-ink-3">Check all fields after import. Your existing draft is kept, and your job target carries over.</p>
          <button type="button" className="btn btn-primary justify-self-start" disabled={text.trim().length < 20} onClick={() => {
            const imported = structuredClone(parsed);
            imported.meta.analysis = structuredClone(current.meta.analysis);
            importDraft(imported, imported.contact.fullName || filename.replace(/\.[^.]+$/, ""));
            setText(""); onImported();
          }}>Create draft & analyse</button>
        </div>
      )}
    </section>
  );
}
