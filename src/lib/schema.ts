import { z } from "zod";

/**
 * Single source of truth for a resume. Every renderer — HTML preview, PDF,
 * DOCX, and each LaTeX style — consumes exactly this shape.
 *
 * Dates are stored as "YYYY-MM" (or "" when unset). Renderers format them.
 */

const ym = z
  .string()
  .regex(/^(\d{4}-(0[1-9]|1[0-2]))?$/, "Use YYYY-MM")
  .default("");

export const ContactSchema = z.object({
  fullName: z.string().default(""),
  headline: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  website: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
});

export const ExperienceSchema = z.object({
  id: z.string(),
  title: z.string().default(""),
  company: z.string().default(""),
  location: z.string().default(""),
  start: ym,
  end: ym,
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
});

export const EducationSchema = z.object({
  id: z.string(),
  school: z.string().default(""),
  degree: z.string().default(""),
  field: z.string().default(""),
  location: z.string().default(""),
  start: ym,
  end: ym,
  gpa: z.string().default(""),
  details: z.array(z.string()).default([]),
});

export const SkillGroupSchema = z.object({
  id: z.string(),
  category: z.string().default(""),
  items: z.array(z.string()).default([]),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  link: z.string().default(""),
  tech: z.string().default(""),
  start: ym,
  end: ym,
  bullets: z.array(z.string()).default([]),
});

export const CertificationSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  issuer: z.string().default(""),
  date: ym,
  link: z.string().default(""),
});

export const SECTION_IDS = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const HTML_TEMPLATE_IDS = ["standard", "student", "combination", "senior"] as const;
export const LATEX_STYLE_IDS = ["classic", "bold", "banking", "columns"] as const;
export type HtmlTemplateId = (typeof HTML_TEMPLATE_IDS)[number];
export type LatexStyleId = (typeof LATEX_STYLE_IDS)[number];

/** Visual controls for the HTML layouts (preview / PDF / DOCX). All ATS-safe. */
export const StyleSchema = z.object({
  /** Typeface pairing. */
  font: z.enum(["sans", "serif", "mixed"]).default("sans"),
  /** Body size in pt. */
  size: z.enum(["10", "10.5", "11"]).default("10.5"),
  /** Page margins. */
  margins: z.enum(["tight", "normal", "roomy"]).default("normal"),
  /** Accent used on the name and section headings. "none" = ink. */
  accent: z.enum(["none", "blue", "green", "burgundy", "graphite"]).default("none"),
  /** Line spacing. */
  leading: z.enum(["compact", "normal", "relaxed"]).default("normal"),
  /** Advanced: extra CSS appended to the sheet stylesheet (preview + PDF). */
  css: z.string().default(""),
});

export const MetaSchema = z.object({
  template: z.enum(HTML_TEMPLATE_IDS).default("standard"),
  latexStyle: z.enum(LATEX_STYLE_IDS).default("classic"),
  /** Explicit section order; sections not listed are appended in default order. */
  sectionOrder: z.array(z.enum(SECTION_IDS)).default([...SECTION_IDS]),
  paper: z.enum(["letter", "a4"]).default("letter"),
  style: StyleSchema.prefault({}),
  /**
   * Hand-edited LaTeX source (from the in-app editor). When set, exports use
   * it instead of regenerating from data. `latexSourceStyle` remembers which
   * style it was generated from so we can warn before overwriting.
   */
  latexSource: z.string().default(""),
  latexSourceStyle: z.enum(LATEX_STYLE_IDS).optional(),
});

export const ResumeSchema = z.object({
  contact: ContactSchema.prefault({}),
  summary: z.string().default(""),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  skills: z.array(SkillGroupSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  meta: MetaSchema.prefault({}),
});

export type Resume = z.infer<typeof ResumeSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type ResumeStyle = z.infer<typeof StyleSchema>;

export const emptyResume = (): Resume => ResumeSchema.parse({});

/** Parse untrusted JSON (imports, localStorage) into a valid Resume, filling defaults. */
export function parseResume(input: unknown): Resume {
  return ResumeSchema.parse(input);
}

/** Section order helper: honours meta.sectionOrder, appends anything missing. */
export function orderedSections(resume: Resume): SectionId[] {
  const seen = new Set<SectionId>();
  const out: SectionId[] = [];
  for (const s of resume.meta.sectionOrder) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  for (const s of SECTION_IDS) if (!seen.has(s)) out.push(s);
  return out;
}

export function sectionHasContent(resume: Resume, id: SectionId): boolean {
  switch (id) {
    case "summary":
      return resume.summary.trim().length > 0;
    case "experience":
      return resume.experience.length > 0;
    case "education":
      return resume.education.length > 0;
    case "skills":
      return resume.skills.some((g) => g.items.length > 0);
    case "projects":
      return resume.projects.length > 0;
    case "certifications":
      return resume.certifications.length > 0;
  }
}

/** ATS-standard headings. Renderers must use these verbatim. */
export const SECTION_HEADINGS: Record<SectionId, string> = {
  summary: "Summary",
  experience: "Work Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
};
