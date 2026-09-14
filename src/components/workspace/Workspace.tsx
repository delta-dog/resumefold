"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Rail } from "./Rail";
import { Preview } from "./Preview";
import { STEPS, stepIndex, type StepId } from "@/lib/steps";
import { useActiveDraft, useActiveResume, useResumeStore } from "@/lib/store";
import { useUiStore } from "@/lib/focus";
import { StepTemplate } from "./steps/StepTemplate";
import { StepBasics } from "./steps/StepBasics";
import { StepExperience } from "./steps/StepExperience";
import { StepEducation } from "./steps/StepEducation";
import { StepSkills } from "./steps/StepSkills";
import { StepProjects } from "./steps/StepProjects";
import { StepExtras } from "./steps/StepExtras";
import { StepReview } from "./steps/StepReview";
import { DraftsMenu } from "./DraftsMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ResumeUpload } from "./ResumeUpload";
import { useSessionNickname } from "@/lib/session";
import { StorageNotice } from "./StorageNotice";

export function Workspace() {
  const [step, setStep] = useState<StepId>("template");
  const [previewOpen, setPreviewOpen] = useState(false);
  const resume = useActiveResume();
  const hydrated = useResumeStore((s) => s.hydrated);
  const lift = useUiStore((s) => s.lift);
  const idx = stepIndex(step);
  const meta = STEPS[idx];
  const nickname = useSessionNickname();
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    main.current?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [step, hydrated]);

  useSaveIndicator();

  if (!hydrated) {
    return (
      <div className="grid h-dvh place-items-center">
        <span className="text-sm text-ink-3">Opening your drafts…</span>
      </div>
    );
  }

  return (
    <div className="device-safe flex h-dvh min-w-0 flex-col overflow-hidden">
      <Header />
      <StorageNotice />
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[232px_minmax(420px,640px)_minmax(0,1fr)] lg:grid-rows-1">
        {/* Rail */}
        <aside className="min-w-0 border-b border-rule/60 py-2 lg:border-b-0 lg:py-4 lg:pr-2">
          <Rail active={step} onSelect={setStep} resume={resume} />
        </aside>

        {/* Step */}
        <main ref={main} className="min-h-0 min-w-0 overflow-y-auto overscroll-contain scroll-thin">
          <div key={step} className="step-in mx-auto max-w-[640px] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-6 sm:px-8">
            <p className="text-xs font-medium text-ink-3">
              Step {idx + 1} of {STEPS.length}
            </p>
            <h1 className="mt-1 font-display text-xl font-bold leading-tight">{meta.label}</h1>
            <p className="mt-2 max-w-[52ch] text-sm text-ink-2">{meta.blurb}</p>
            {step === "template" && nickname && <p className="mt-3 text-xs text-ink-3">Welcome, <span className="font-medium text-ink-2">{nickname}</span>. Let’s get your resume ready.</p>}
            <div className="mt-7">
              {step === "template" && <div className="grid gap-7"><ResumeUpload onImported={() => setStep("review")} /><StepTemplate onSelect={() => {
                if (window.matchMedia("(max-width: 767px), (pointer: coarse)").matches) setStep("basics");
              }} /></div>}
              {step === "basics" && <StepBasics />}
              {step === "experience" && <StepExperience />}
              {step === "education" && <StepEducation />}
              {step === "skills" && <StepSkills />}
              {step === "projects" && <StepProjects />}
              {step === "extras" && <StepExtras />}
              {step === "review" && <StepReview goTo={setStep} />}
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={idx === 0}
                onClick={() => setStep(STEPS[idx - 1].id)}
              >
                ← {idx > 0 ? STEPS[idx - 1].label : ""}
              </button>
              {idx < STEPS.length - 1 ? (
                <button type="button" className="btn btn-primary" onClick={() => setStep(STEPS[idx + 1].id)}>
                  {STEPS[idx + 1].label} →
                </button>
              ) : null}
            </div>
          </div>
        </main>

        {/* Preview — a column on large screens, an overlay below that */}
        <section
          className={`min-h-0 min-w-0 overflow-hidden bg-paper-3 lg:m-2 lg:ml-0 lg:block lg:rounded-card ${
            previewOpen ? "device-safe fixed inset-0 z-40 flex flex-col" : "hidden"
          }`}
          aria-label="Live preview"
        >
          {previewOpen && (
            <div className="flex min-h-16 shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top)] lg:hidden">
              <span className="text-sm font-medium">Preview</span>
              <button type="button" className="btn btn-tonal btn-sm" onClick={() => setPreviewOpen(false)}>
                Close
              </button>
            </div>
          )}
          <div className={previewOpen ? "min-h-0 flex-1 lg:h-full" : "h-full"}>
            <Preview resume={resume} lift={lift} />
          </div>
        </section>

        {!previewOpen && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="btn btn-primary fixed bottom-[max(20px,env(safe-area-inset-bottom))] right-4 z-30 lg:hidden"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            Preview
          </button>
        )}
      </div>
    </div>
  );
}

function Header() {
  const draft = useActiveDraft();
  const saveState = useResumeStore((s) => s.saveState);
  const rename = useResumeStore((s) => s.renameDraft);

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-rule/60 px-4 pb-2 pt-[max(8px,env(safe-area-inset-top))] sm:h-16 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-0">
      <Link href="/" className="shrink-0 font-display text-[22px] font-bold tracking-tight">
        ResumeFold
      </Link>
      <span className="hidden h-5 w-px bg-rule sm:block" aria-hidden />
      <div className="order-last flex w-full min-w-0 items-center gap-2 sm:order-none sm:w-auto sm:flex-1">
      <input
        aria-label="Draft name"
        value={draft?.name ?? ""}
        onChange={(e) => draft && rename(draft.id, e.target.value)}
        className="min-w-0 max-w-[300px] flex-1 rounded-pill bg-transparent px-3 py-1.5 text-base font-medium text-ink outline-none hover:bg-paper-3 focus:bg-paper-3 sm:text-sm"
      />
      <SaveBadge state={saveState} />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <ThemeToggle compact />
        <DraftsMenu />
      </div>
    </header>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "idle") return null;
  return (
    <span className="relative text-xs text-ink-3" aria-live="polite">
      {state === "saving" ? "Saving…" : "Saved"}
      {state === "saved" && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-moss"
          style={{ animation: "underline-draw 320ms var(--ease-out) both" }}
        />
      )}
    </span>
  );
}

/** Turn "saving" into "saved" a beat after the last edit. Persistence itself is synchronous. */
function useSaveIndicator() {
  const saveState = useResumeStore((s) => s.saveState);
  const markSaved = useResumeStore((s) => s.markSaved);
  useEffect(() => {
    if (saveState !== "saving") return;
    const t = setTimeout(markSaved, 600);
    return () => clearTimeout(t);
  }, [saveState, markSaved]);
}
