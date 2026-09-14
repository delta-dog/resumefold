export type ImportStage = "file-read" | "text-decode" | "docx-read" | "pdf-load" | "pdf-text";

export class ResumeReadError extends Error {
  readonly diagnostic: string;
  constructor(stage: ImportStage, cause: unknown) {
    const original = cause instanceof Error ? cause : new Error("Unknown error");
    super(stage === "text-decode" && original instanceof TypeError
      ? "This TXT file is not UTF-8 text. Save it as UTF-8, or paste its contents below."
      : original instanceof TypeError || original instanceof ReferenceError
      ? "The resume reader encountered a compatibility error. You can paste your resume text below while we investigate."
      : original.message, { cause });
    this.name = "ResumeReadError";
    this.diagnostic = `${stage}: ${original.name}: ${original.message}`.slice(0, 300);
  }
}
