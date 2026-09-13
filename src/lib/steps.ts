import type { Resume } from "./schema";

export type StepId =
  | "template"
  | "basics"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "extras"
  | "review";

export type Step = {
  id: StepId;
  label: string;
  blurb: string;
  /** 0..1 how filled-in this step is, for the rail */
  progress: (r: Resume) => number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export const STEPS: Step[] = [
  {
    id: "template",
    label: "Template",
    blurb: "Choose your layout and style.",
    progress: () => 1,
  },
  {
    id: "basics",
    label: "Basics",
    blurb: "Add your name and contact details.",
    progress: (r) => {
      const c = r.contact;
      const req = [c.fullName, c.email, c.phone, c.location];
      return clamp(req.filter(Boolean).length / req.length);
    },
  },
  {
    id: "experience",
    label: "Experience",
    blurb: "Newest roles first. Show your impact with specific results.",
    progress: (r) => {
      if (r.experience.length === 0) return 0;
      const ok = r.experience.filter((e) => e.title && e.company && e.start && e.bullets.length > 0).length;
      return clamp(ok / r.experience.length);
    },
  },
  {
    id: "education",
    label: "Education",
    blurb: "Degrees and schools. GPA only if it helps you.",
    progress: (r) => (r.education.length > 0 && r.education.every((e) => e.school && e.degree) ? 1 : r.education.length ? 0.5 : 0),
  },
  {
    id: "skills",
    label: "Skills",
    blurb: "Group related skills, such as languages or tools.",
    progress: (r) => clamp(r.skills.filter((g) => g.items.length > 0).length / 2),
  },
  {
    id: "projects",
    label: "Projects",
    blurb: "Show relevant projects, especially if you're new to work.",
    progress: (r) => (r.projects.length ? 1 : 0),
  },
  {
    id: "extras",
    label: "Extras",
    blurb: "Add certifications and adjust sections and paper size.",
    progress: (r) => (r.certifications.length || r.summary ? 1 : 0),
  },
  {
    id: "review",
    label: "Review & export",
    blurb: "Check your resume, then export PDF, DOCX or LaTeX.",
    progress: () => 1,
  },
];

export const stepIndex = (id: StepId) => STEPS.findIndex((s) => s.id === id);
