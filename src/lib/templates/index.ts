import type { HtmlTemplateId, LatexStyleId, SectionId } from "@/lib/schema";

export type HtmlTemplateMeta = {
  id: HtmlTemplateId;
  name: string;
  tagline: string;
  bestFor: string;
  sectionOrder: SectionId[];
  atsSafe: true;
};

export const HTML_TEMPLATES: HtmlTemplateMeta[] = [
  {
    id: "standard",
    name: "Standard",
    tagline: "Clean sans-serif, newest roles first",
    bestFor: "For most applications.",
    sectionOrder: ["summary", "experience", "projects", "education", "skills", "certifications"],
    atsSafe: true,
  },
  {
    id: "student",
    name: "Student",
    tagline: "Education first, compact serif type",
    bestFor: "For students and new grads.",
    sectionOrder: ["education", "experience", "projects", "skills", "certifications", "summary"],
    atsSafe: true,
  },
  {
    id: "combination",
    name: "Combination",
    tagline: "Skills first, clear headings",
    bestFor: "For career changes and technical roles.",
    sectionOrder: ["summary", "skills", "experience", "projects", "education", "certifications"],
    atsSafe: true,
  },
  {
    id: "senior",
    name: "Senior",
    tagline: "Serif headings, generous spacing",
    bestFor: "For leads and experienced professionals.",
    sectionOrder: ["summary", "experience", "education", "certifications", "skills", "projects"],
    atsSafe: true,
  },
];

export type LatexStyleMeta = {
  id: LatexStyleId;
  name: string;
  tagline: string;
  /** One line on when to pick it. */
  detail: string;
  engine: "pdflatex" | "xelatex";
  atsSafe: boolean;
  atsNote?: string;
};

export const LATEX_STYLES: LatexStyleMeta[] = [
  {
    id: "classic",
    name: "Classic",
    tagline: "Small caps and compact spacing",
    detail: "A compact layout for engineering roles.",
    engine: "pdflatex",
    atsSafe: true,
  },
  {
    id: "bold",
    name: "Bold",
    tagline: "Large heading, one accent colour",
    detail: "For product, design and senior engineering roles.",
    engine: "pdflatex",
    atsSafe: true,
  },
  {
    id: "banking",
    name: "Banking",
    tagline: "Classic serif type and subtle rules",
    detail: "For finance, law and consulting.",
    engine: "pdflatex",
    atsSafe: true,
  },
  {
    id: "columns",
    name: "Two-column",
    tagline: "Two columns with a sidebar",
    detail: "For direct sharing. Avoid ATS uploads.",
    engine: "pdflatex",
    atsSafe: false,
    atsNote:
      "Two-column layouts read out of order in Workday and Taleo. Use this only when a human will read the PDF.",
  },
];

export const htmlTemplate = (id: HtmlTemplateId) => HTML_TEMPLATES.find((t) => t.id === id)!;
export const latexStyle = (id: LatexStyleId) => LATEX_STYLES.find((t) => t.id === id)!;
