"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { checkResume, keywordMatch, suggestKeywords, type Issue } from "@/lib/ats/check";
import { useActiveResume, useResumeStore } from "@/lib/store";
import { useUiStore } from "@/lib/focus";
import { latexForExport } from "@/lib/latex/source";
import Link from "next/link";
import { latexStyle } from "@/lib/templates";
import { downloadLatexZip, downloadText, openInOverleaf, resumeFilename, downloadBlob } from "@/lib/export/download";
import { printSheet } from "@/lib/export/pdf";
import { parseResume } from "@/lib/schema";
import type { StepId } from "@/lib/steps";
import { ResumeUpload } from "../ResumeUpload";

export function StepReview({ goTo }: { goTo: (s: StepId) => void }) {
  const r = useActiveResume();
  const report = useMemo(() => checkResume(r), [r]);
  const setLift = useUiStore((s) => s.setLift);

  // The moment: when the score crosses into "ready", lift the sheet for a beat.
  const wasReady = useRef(report.ready);
  useEffect(() => {
    if (report.ready && !wasReady.current) {
      setLift(true);
      const t = setTimeout(() => setLift(false), 1400);
      return () => clearTimeout(t);
    }
    wasReady.current = report.ready;
  }, [report.ready, setLift]);
  useEffect(() => {
    // first arrival on the step while already ready: a gentler lift
    if (report.ready) {
      setLift(true);
      const t = setTimeout(() => setLift(false), 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-10">
      <ResumeUpload onImported={() => goTo("review")} />
      <ImportNotes />
      <ScoreCard score={report.score} ready={report.ready} stats={report.stats} />

      {report.issues.length > 0 && (
        <section className="grid gap-3">
          <h3 className="font-display text-md font-bold">
            {report.issues.length} thing{report.issues.length > 1 ? "s" : ""} to look at
          </h3>
          <ul className="grid gap-2">
            {report.issues.map((i) => (
              <IssueRow key={i.id} issue={i} onFix={i.step ? () => goTo(i.step!) : undefined} />
            ))}
          </ul>
        </section>
      )}

      <Passes passes={report.passes} />

      <Keywords />

      <Exports />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ScoreCard({ score, ready, stats }: { score: number; ready: boolean; stats: { words: number; bullets: number; quantified: number } }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(score), 50);
    return () => clearTimeout(t);
  }, [score]);
  const color = ready ? "var(--moss)" : score >= 60 ? "var(--amber)" : "var(--danger)";

  return (
    <div className="tile flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-7">
      <div className="relative grid h-28 w-28 shrink-0 place-items-center">
        <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
          <circle cx="56" cy="56" r={R} fill="none" stroke="var(--rule)" strokeWidth="8" />
          <circle
            cx="56"
            cy="56"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - (C * shown) / 100}
            style={{ transition: "stroke-dashoffset 900ms var(--ease-spring), stroke 300ms" }}
          />
        </svg>
        <span className="absolute font-mono text-[26px] font-medium tabular-nums" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold leading-tight" key={String(ready)}>
          <span className="step-in inline-block">{ready ? "Ready to send." : score >= 60 ? "Nearly there." : "Not yet. Fix these first."}</span>
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          {ready
            ? "The local structure checks pass. Review your details and the target job before sending."
            : "Fix the items below. Each one links to the step that changes it."}
        </p>
        <p className="mt-2 text-xs text-ink-3">
          Draft structure · {stats.words} words · {stats.bullets} bullets · {stats.quantified} quantified
        </p>
      </div>
    </div>
  );
}

function IssueRow({ issue, onFix }: { issue: Issue; onFix?: () => void }) {
  const tone =
    issue.severity === "fail"
      ? { stripe: "bg-danger", chip: "bg-danger-soft text-danger", label: "Fix" }
      : issue.severity === "warn"
        ? { stripe: "bg-amber", chip: "bg-amber-soft text-amber", label: "Warning" }
        : { stripe: "bg-ink-3", chip: "bg-paper-2 text-ink-2", label: "Tip" };
  return (
    <li className="card fade-in relative flex gap-4 overflow-hidden p-4 pl-5">
      <span className={`absolute bottom-0 left-0 top-0 w-1 ${tone.stripe}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${tone.chip}`}>{tone.label}</span>
          <span className="text-sm font-semibold">{issue.title}</span>
        </div>
        <p className="mt-1 text-sm text-ink-2">{issue.detail}</p>
      </div>
      {onFix && (
        <button type="button" onClick={onFix} className="btn btn-secondary btn-sm self-center">
          Go →
        </button>
      )}
    </li>
  );
}

function Passes({ passes }: { passes: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="grid gap-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-moss-soft text-moss">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.5l2.5 2.5 4.5-5" />
          </svg>
        </span>
        <span className="text-sm font-semibold">{passes.length} checks passed</span>
        <span className="text-xs text-ink-3">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <ul className="fade-in flex flex-wrap gap-1.5">
          {passes.map((p) => (
            <li key={p.id} className="rounded-pill bg-moss-soft px-3 py-1 text-xs font-medium text-moss">
              {p.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Keywords() {
  const r = useActiveResume();
  const update = useResumeStore((s) => s.update);
  const target = r.meta.analysis;
  const jd = useDeferredValue(target.jobDescription);
  const keywords = useDeferredValue(target.keywords);
  const suggested = useMemo(() => suggestKeywords(jd), [jd]);
  const report = useMemo(() => keywordMatch(jd, r, keywords, target.source === "upload" && r.meta.imported.text ? r.meta.imported.text : undefined), [jd, r, keywords, target.source]);
  const id = useId();
  return (
    <section className="grid gap-3">
      <div>
        <h3 className="font-display text-md font-bold">Keyword match</h3>
        <p className="mt-1 text-sm text-ink-2">
          Paste this job’s posting, then review its suggested skills and phrases. Your target is saved with this draft.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-ink-2">Target job title<input className="field" value={target.jobTitle} maxLength={160} placeholder="e.g. Data analyst" onChange={(e) => update((r) => { r.meta.analysis.jobTitle = e.target.value; })} /></label>
        <label className="grid gap-1 text-xs text-ink-2">Company<input className="field" value={target.company} maxLength={160} placeholder="Optional" onChange={(e) => update((r) => { r.meta.analysis.company = e.target.value; })} /></label>
      </div>
      <label htmlFor={`${id}-posting`} className="label">Job posting</label>
      <textarea
        id={`${id}-posting`}
        className="field"
        rows={5}
        value={target.jobDescription}
        maxLength={30000}
        onChange={(e) => update((r) => { r.meta.analysis.jobDescription = e.target.value; })}
        placeholder="Paste the job posting here…"
      />
      <label htmlFor={`${id}-keywords`} className="label">Keywords and phrases to check</label>
      <textarea id={`${id}-keywords`} className="field" rows={3} maxLength={3000} value={target.keywords} placeholder="e.g. SQL, financial reporting, customer service" onChange={(e) => update((r) => { r.meta.analysis.keywords = e.target.value; })} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondary btn-sm" disabled={!suggested.length} onClick={() => update((r) => { r.meta.analysis.keywords = suggestKeywords(r.meta.analysis.jobDescription).join(", "); })}>Use suggested keywords</button>
        <span className="text-xs text-ink-3">Comma-separated. Leave blank for automatic suggestions.</span>
      </div>
      {r.meta.imported.text && <label className="grid gap-1 text-xs text-ink-2">Compare against<select className="field" value={target.source} onChange={(e) => update((r) => { r.meta.analysis.source = e.target.value === "upload" ? "upload" : "draft"; })}><option value="draft">Edited draft</option><option value="upload">Uploaded resume text</option></select></label>}
      <p className="text-xs text-ink-3">Coverage checks wording and common abbreviations. It is not an employer’s ATS score or a prediction of interview chances. Add only skills you can support.</p>
      {!report && (target.jobDescription || target.keywords) && <p role="status" className="text-sm text-ink-2">No clear terms found yet. Add your own keywords, or paste a fuller posting.</p>}
      {report && (
        <div className="card fade-in grid gap-4 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">
              {report.matched.length} of {report.matched.length + report.missing.length} terms present
            </span>
            <span className="font-mono text-xs text-ink-3">{Math.round(report.coverage * 100)}% coverage</span>
          </div>
          {report.missing.length > 0 && (
            <div>
              <p className="label">Missing. Add only the ones that are true of you</p>
              <ul className="flex flex-wrap gap-1.5">
                {report.missing.map((k) => (
                  <li key={k} className="rounded-pill border border-amber/40 bg-amber-soft px-2.5 py-0.5 text-xs font-medium text-amber">
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.matched.length > 0 && (
            <div>
              <p className="label">Already there</p>
              <ul className="flex flex-wrap gap-1.5">
                {report.matched.map((k) => (
                  <li key={k} className="rounded-pill bg-moss-soft px-2.5 py-0.5 text-xs font-medium text-moss">
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ImportNotes() {
  const r = useActiveResume();
  const update = useResumeStore((s) => s.update);
  const imported = r.meta.imported;
  if (!imported.filename) return null;
  return (
    <section className="card grid min-w-0 gap-3 p-4">
      <h3 className="font-display text-md font-bold">Import notes</h3>
      <p className="break-all text-xs text-ink-3">From {imported.filename}. Analysis checks the new draft’s structure, not the original file’s layout.</p>
      <ul className="list-disc space-y-1 pl-4 text-xs text-ink-2">{imported.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Original extracted text</summary>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-ink-2">{imported.text}</pre>
      </details>
      {imported.unassigned && <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Unassigned text</summary>
        <p className="mb-2 text-xs text-ink-3">Kept here for review. Copy it into the correct fields, or add it to your summary before exporting.</p>
        <textarea aria-label="Unassigned resume text" className="field" rows={4} maxLength={100000} value={imported.unassigned} onChange={(e) => update((r) => { r.meta.imported.unassigned = e.target.value; })} />
        <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={() => update((r) => { r.summary = [r.summary, r.meta.imported.unassigned].filter(Boolean).join("\n"); r.meta.imported.unassigned = ""; })}>Add to summary</button>
      </details>}
    </section>
  );
}

function Exports() {
  const r = useActiveResume();
  const replace = useResumeStore((s) => s.replace);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const style = latexStyle(r.meta.latexStyle);
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    setNote(null);
    try {
      await fn();
    } catch (e) {
      setNote(`Export failed: ${String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const pdf = () =>
    run("pdf", async () => {
      const res = await printSheet(r);
      if (!res.ok) setNote(`Couldn't open the print dialog: ${res.reason}`);
      else setNote("In the print dialog, choose “Save as PDF”. Paper size and margins are already set.");
    });

  const docx = () =>
    run("docx", async () => {
      const { renderDocx } = await import("@/lib/export/docx");
      downloadBlob(await renderDocx(r), resumeFilename(r, "docx"));
    });

  const latex = () => latexForExport(r);
  const edited = Boolean(r.meta.latexSource.trim());

  const importJson = (file: File) => {
    file.text().then((t) => {
      try {
        replace(parseResume(JSON.parse(t)));
        setNote("Imported. This replaced the draft you had open.");
      } catch {
        setNote("That file isn't a resume export from here.");
      }
    });
  };

  return (
    <section className="grid gap-4">
      <div>
        <h3 className="font-display text-md font-bold">Export</h3>
        <p className="mt-1 text-sm text-ink-2">All three come from the same data, so they always agree with each other.</p>
      </div>

      <div className="grid gap-3">
        <ExportRow
          title="ATS-safe PDF"
          detail="Opens your browser's print dialog with the page ready. Choose “Save as PDF”. Real text, single column, nothing uploaded."
          actions={
            <button type="button" className="btn btn-primary" onClick={pdf} disabled={busy !== null}>
              {busy === "pdf" ? "Opening…" : "Save as PDF"}
            </button>
          }
        />
        <ExportRow
          title="ATS-safe DOCX"
          detail="Real Word heading styles, tab-stop dates, plain bullets. The safest upload for older Taleo and iCIMS portals."
          actions={
            <button type="button" className="btn btn-secondary" onClick={docx} disabled={busy !== null}>
              {busy === "docx" ? "Building…" : "Download DOCX"}
            </button>
          }
        />
        <ExportRow
          title={`LaTeX · ${style.name} style${edited ? " (hand-edited)" : ""}`}
          detail={
            edited
              ? "Exports use the source you edited in the LaTeX studio."
              : style.atsSafe
                ? "One self-contained .tex file. Edit it in the studio with live compile, or open it straight in Overleaf."
                : "Two-column. For humans, not portals. Edit it in the studio or open it in Overleaf."
          }
          actions={
            <>
              <Link href="/latex" prefetch={false} className="btn btn-primary">
                Open LaTeX studio
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => run("ov", () => openInOverleaf(latex()))}>
                Open in Overleaf
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => run("tex", () => downloadText(latex().files["resume.tex"], resumeFilename(r, "tex"), "application/x-tex"))}
              >
                .tex
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => run("zip", () => downloadLatexZip(latex(), r))}>
                .zip
              </button>
            </>
          }
        />
        <ExportRow
          title="Backup"
          detail="Your data as JSON. Drafts live in this browser's storage, so export a backup before you clear it."
          actions={
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => downloadText(JSON.stringify(r, null, 2), resumeFilename(r, "json"), "application/json")}
              >
                Export JSON
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
                Import JSON
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJson(f);
                  e.target.value = "";
                }}
              />
            </>
          }
        />
      </div>
      {note && <p className="fade-in text-sm text-ink-2">{note}</p>}
    </section>
  );
}

function ExportRow({ title, detail, actions }: { title: string; detail: string; actions: React.ReactNode }) {
  return (
    <div className="card flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-[200px] flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-ink-2">{detail}</p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
