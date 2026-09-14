"use client";

import { useStorageIssue } from "@/lib/storage";
import { useActiveResume } from "@/lib/store";
import { downloadText, resumeFilename } from "@/lib/export/download";

export function StorageNotice() {
  const issue = useStorageIssue();
  const resume = useActiveResume();
  if (!issue) return null;
  return (
    <div role="status" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-rule bg-amber-soft px-4 py-2 text-xs text-amber">
      <p className="min-w-0 flex-1">{issue === "unreadable" ? "Saved drafts could not be read." : issue === "full" ? "Browser storage is full." : "Browser storage is blocked."} Changes stay in this tab. Back up each draft before closing or refreshing.</p>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadText(JSON.stringify(resume, null, 2), resumeFilename(resume, "json"), "application/json")}>Back up draft</button>
    </div>
  );
}
