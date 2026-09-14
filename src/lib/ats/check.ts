import { sectionHasContent, type Resume } from "@/lib/schema";

/**
 * ATS compliance checker. Pure rules over the resume data + template choice —
 * no network, no models. Encodes the ruleset from the research phase:
 *
 *   A1 single column     A2 no tables       A3 no text boxes
 *   A4 contact in body   A5 no images/icons A6 standard headings
 *   A7 real text
 *   B1 consistent dates  B2 complete entries B3 standard fonts
 *   B4 plain bullets     B5 no special chars B6 skills as lines
 *   B7 file format       B8 keywords
 *
 * A-rules are guaranteed by construction of the HTML/DOCX renderers, so they
 * surface as passes (the satisfying part). The B-rules and content-quality
 * checks are where a resume actually loses points.
 */

export type Severity = "fail" | "warn" | "info";

export type Issue = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  /** which wizard step fixes it */
  step?: "template" | "basics" | "experience" | "education" | "skills" | "projects" | "extras";
};

export type Pass = { id: string; title: string };

export type AtsReport = {
  score: number; // 0..100
  ready: boolean;
  issues: Issue[];
  passes: Pass[];
  stats: { words: number; bullets: number; quantified: number; weak: number };
};

const WEAK_STARTS = [
  "responsible for",
  "worked on",
  "worked with",
  "helped",
  "assisted",
  "duties included",
  "tasked with",
  "participated in",
  "involved in",
  "was ",
  "i ",
  "my ",
  "we ",
];

const SPECIAL = /[←-⇿☀-➿\u{1F300}-\u{1FAFF}★☆✓✔➤►▪▸]/u;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS = /\d/g;

export function checkResume(r: Resume): AtsReport {
  const issues: Issue[] = [];
  const passes: Pass[] = [];

  // ---- Structural guarantees (by construction) ----
  passes.push({ id: "A1", title: "Single-column layout" });
  passes.push({ id: "A2", title: "No tables or text boxes" });
  passes.push({ id: "A4", title: "Contact details in the page body, not a header" });
  passes.push({ id: "A5", title: "No images, icons, or skill bars" });
  passes.push({ id: "A6", title: "Standard section headings (Work Experience, Education, Skills)" });
  passes.push({ id: "A7", title: "Text-selectable PDF with Unicode mapping" });
  passes.push({ id: "B3", title: "Standard, embedded fonts at 10–12pt" });
  passes.push({ id: "B4", title: "Plain bullet characters" });
  passes.push({ id: "B6", title: "Skills listed as labelled lines" });

  if (r.meta.latexStyle === "columns") {
    issues.push({
      id: "L1",
      severity: "warn",
      title: "The Two-column LaTeX style is not parser-safe",
      detail:
        "Your PDF and DOCX exports are single-column and fine. The .tex export uses a sidebar that Workday and Taleo read out of order. Switch to Classic, Bold or Banking if that file is going into a portal.",
      step: "template",
    });
  }

  // ---- Contact ----
  const c = r.contact;
  if (!c.fullName.trim()) issues.push({ id: "C1", severity: "fail", title: "Missing name", detail: "The parser builds the whole profile around it.", step: "basics" });
  if (!c.email.trim()) issues.push({ id: "C2", severity: "fail", title: "Missing email", detail: "No email, no contact record. They can't get back to you.", step: "basics" });
  else if (!EMAIL.test(c.email.trim()))
    issues.push({ id: "C2b", severity: "warn", title: "Email doesn't look valid", detail: `“${c.email}” won't match an email pattern.`, step: "basics" });
  if (!c.phone.trim()) issues.push({ id: "C3", severity: "warn", title: "Missing phone number", detail: "Most portals have a required phone field the parser tries to fill in for you.", step: "basics" });
  else if ((c.phone.match(PHONE_DIGITS) ?? []).length < 10)
    issues.push({ id: "C3b", severity: "warn", title: "Phone number looks short", detail: "Include the area code (and country code if applying abroad).", step: "basics" });
  if (!c.location.trim()) issues.push({ id: "C4", severity: "warn", title: "Missing location", detail: "Recruiters filter by city or country. “San Francisco, CA” is plenty.", step: "basics" });
  if (c.fullName.trim() && c.email.trim() && c.phone.trim() && c.location.trim())
    passes.push({ id: "C0", title: "Complete contact block" });

  // ---- Sections ----
  const hasExp = sectionHasContent(r, "experience");
  const hasEdu = sectionHasContent(r, "education");
  if (!hasExp && !hasEdu)
    issues.push({ id: "S1", severity: "fail", title: "No experience or education", detail: "With neither, the parser has nothing to score you on.", step: "experience" });
  if (!sectionHasContent(r, "skills"))
    issues.push({ id: "S2", severity: "warn", title: "No skills section", detail: "Keyword matching leans on it heavily. Two to four grouped lines is plenty.", step: "skills" });
  else passes.push({ id: "S2", title: "Skills section present" });

  // ---- Experience entries (B2 + reverse chronological + bullets) ----
  let words = 0;
  let bullets = 0;
  let quantified = 0;
  let weak = 0;
  const weakExamples: string[] = [];
  const longExamples: string[] = [];
  const specialExamples: string[] = [];

  const scanBullets = (list: string[]) => {
    for (const b of list) {
      const t = b.trim();
      if (!t) continue;
      bullets++;
      const w = t.split(/\s+/).length;
      words += w;
      if (/\d/.test(t)) quantified++;
      const lower = t.toLowerCase();
      if (WEAK_STARTS.some((s) => lower.startsWith(s))) {
        weak++;
        if (weakExamples.length < 3) weakExamples.push(t.slice(0, 60));
      }
      if (w > 38 && longExamples.length < 3) longExamples.push(t.slice(0, 60));
      if (SPECIAL.test(t) && specialExamples.length < 3) specialExamples.push(t.slice(0, 40));
    }
  };

  words += r.summary.trim() ? r.summary.trim().split(/\s+/).length : 0;

  r.experience.forEach((e, i) => {
    const missing: string[] = [];
    if (!e.title.trim()) missing.push("title");
    if (!e.company.trim()) missing.push("company");
    if (!e.location.trim()) missing.push("location");
    if (!e.start) missing.push("start date");
    if (!e.current && !e.end) missing.push("end date");
    if (missing.length)
      issues.push({
        id: `E${i}m`,
        severity: missing.includes("title") || missing.includes("company") || missing.includes("start date") ? "fail" : "warn",
        title: `${e.title || e.company || `Role ${i + 1}`}: missing ${missing.join(", ")}`,
        detail: "Parsers file each job under title, employer, location and dates. Lose one and the whole entry can go with it.",
        step: "experience",
      });
    if (e.bullets.filter((b) => b.trim()).length === 0)
      issues.push({ id: `E${i}b`, severity: "warn", title: `${e.title || `Role ${i + 1}`}: no bullets`, detail: "Two to five bullets per role. Say what changed because you were there.", step: "experience" });
    if (e.start && e.end && !e.current && e.end < e.start)
      issues.push({ id: `E${i}d`, severity: "fail", title: `${e.title || `Role ${i + 1}`}: end date before start date`, detail: "The tenure maths breaks.", step: "experience" });
    scanBullets(e.bullets);
  });

  // reverse-chronological check
  const starts = r.experience.map((e) => e.start).filter(Boolean);
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] > starts[i - 1]) {
      issues.push({
        id: "E-order",
        severity: "warn",
        title: "Experience isn't in reverse-chronological order",
        detail: "Most recent role first. Parsers and recruiters both assume it.",
        step: "experience",
      });
      break;
    }
  }
  if (starts.length > 1 && !issues.some((x) => x.id === "E-order")) passes.push({ id: "E-order", title: "Reverse-chronological order" });

  r.education.forEach((e, i) => {
    if (!e.school.trim() || !e.degree.trim())
      issues.push({ id: `D${i}`, severity: "warn", title: `Education ${i + 1}: missing ${!e.school.trim() ? "school" : "degree"}`, detail: "Degree parsers look for both.", step: "education" });
    scanBullets(e.details);
  });
  r.projects.forEach((p) => scanBullets(p.bullets));

  // ---- Content quality ----
  if (weak > 0)
    issues.push({
      id: "Q1",
      severity: "warn",
      title: `${weak} bullet${weak > 1 ? "s" : ""} open with weak phrasing`,
      detail: `Lead with what you did, not that you were “responsible for” it. For example: “${weakExamples[0]}…”`,
      step: "experience",
    });
  if (bullets >= 3 && quantified / bullets < 0.4)
    issues.push({
      id: "Q2",
      severity: "info",
      title: `Only ${quantified} of ${bullets} bullets have a number`,
      detail: "Aim for half or more. Latency, revenue, users, time saved, team size. Anything you can count.",
      step: "experience",
    });
  else if (bullets >= 3) passes.push({ id: "Q2", title: "Most bullets are quantified" });
  if (longExamples.length)
    issues.push({
      id: "Q3",
      severity: "info",
      title: `${longExamples.length === 3 ? "Several" : longExamples.length} bullet${longExamples.length > 1 ? "s run" : " runs"} past two lines`,
      detail: `Keep bullets under about 35 words. For example: “${longExamples[0]}…”`,
      step: "experience",
    });
  if (specialExamples.length)
    issues.push({
      id: "B5",
      severity: "warn",
      title: "Arrows, stars, or emoji in text",
      detail: `Older parsers turn them into junk characters mid-sentence. Found in “${specialExamples[0]}…”`,
      step: "experience",
    });
  else passes.push({ id: "B5", title: "No special characters" });

  // ---- Length ----
  const yrs = yearsOfExperience(r);
  const wordCap = yrs >= 8 || r.meta.template === "senior" ? 1100 : 620;
  if (words > wordCap)
    issues.push({
      id: "P1",
      severity: "info",
      title: `Roughly ${words} words, which is probably over ${yrs >= 8 ? "two pages" : "one page"}`,
      detail: yrs >= 8 ? "Roles older than ten years can be a single line each." : "Under about eight years of experience, one page is the norm. Cut the oldest bullets first.",
      step: "experience",
    });

  // ---- Score ----
  let score = 100;
  for (const i of issues) score -= i.severity === "fail" ? 18 : i.severity === "warn" ? 7 : 3;
  score = Math.max(0, Math.min(100, score));
  const ready = score >= 85 && !issues.some((i) => i.severity === "fail");

  const order: Record<Severity, number> = { fail: 0, warn: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return { score, ready, issues, passes, stats: { words, bullets, quantified, weak } };
}

function yearsOfExperience(r: Resume): number {
  const starts = r.experience.map((e) => e.start).filter(Boolean).sort();
  if (!starts.length) return 0;
  const first = Number(starts[0].slice(0, 4));
  return new Date().getFullYear() - first;
}

// ---------------------------------------------------------------------------
// Keyword match against a pasted job description (B8). Pure heuristics.
// ---------------------------------------------------------------------------

const STOP = new Set(
  `a an and are as at be by for from has have in is it its of on or that the to was were will with you your we our this these those they their them he she his her not but if then than so such can may must should would could also more most other some any all each into over under about after before between through during without within across per via etc using use used
  experience team work working ability strong excellent good great years year skills skill knowledge role responsibilities responsible requirements required preferred plus bonus including include includes candidate candidates position job company benefits equal opportunity employer develop developing development build building design designing designs support supporting help ensure ensuring provide providing manage managing management deliver delivering solutions solution business customer customers product products projects project new well time day days ways way high level levels degree bachelor bachelors master masters related field fields communication written verbal environment fast paced paced`
    .split(/\s+/)
    .filter(Boolean),
);

/** Tokens that look like tech / domain terms: keep case, dots, plus, hash (C++, C#, Node.js, CI/CD). */
function tokenize(text: string): string[] {
  return text
    .replace(/[‘’]/g, "'")
    .split(/[\s,;:()\[\]{}"“”|]+/)
    .map((t) => t.replace(/^[.!?/-]+|[.!?/-]+$/g, ""))
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t));
}

export type KeywordReport = {
  matched: string[];
  missing: string[];
  coverage: number; // 0..1
};

const PHRASES = ["project management", "product management", "customer service", "customer success", "data analysis", "data analytics", "machine learning", "deep learning", "natural language processing", "continuous integration", "continuous delivery", "version control", "financial modeling", "financial modelling", "financial reporting", "risk management", "stakeholder management", "supply chain", "quality assurance", "quality control", "patient care", "clinical research", "digital marketing", "search engine optimization", "content strategy", "business analysis", "business intelligence", "user research", "interaction design", "problem solving", "public speaking", "account management", "sales operations", "human resources", "talent acquisition"];
const ALIASES: Record<string, string[]> = {
  "node.js": ["nodejs", "node js"], "react.js": ["reactjs", "react"], "postgresql": ["postgres"],
  "javascript": ["js"], "typescript": ["ts"], "amazon web services": ["aws"], "aws": ["amazon web services"],
  "search engine optimization": ["seo"], "seo": ["search engine optimization"],
  "continuous integration": ["ci/cd"], "continuous delivery": ["ci/cd"],
  "microsoft excel": ["excel"], "financial modeling": ["financial modelling"],
};
const NAMED_SKILLS = new Set("python javascript typescript java react node.js nodejs sql postgresql postgres mysql sqlite excel aws azure docker kubernetes git html css figma tableau powerbi salesforce jira sap r matlab tensorflow pytorch c++ c# go rust ruby php swift kotlin linux pandas numpy accounting bookkeeping nursing logistics negotiation auditing".split(" "));

function normaliseTerm(text: string) { return text.normalize("NFKC").toLowerCase().replace(/[–—-]/g, " ").replace(/\s+/g, " ").trim(); }
export function containsKeyword(text: string, term: string): boolean {
  return matchesNormalised(normaliseTerm(text), term);
}
function matchesNormalised(corpus: string, term: string): boolean {
  const key = normaliseTerm(term);
  if (!key) return false;
  return [key, ...(ALIASES[key] ?? [])].some((alias) => {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(alias)}(?:s|es)?(?=$|[^\\p{L}\\p{N}+#])`, "u");
    return re.test(corpus);
  });
}

export function suggestKeywords(jobDescription: string): string[] {
  const counts = new Map<string, { n: number; display: string }>();
  const corpus = normaliseTerm(jobDescription);
  const phrases = PHRASES.filter((phrase) => matchesNormalised(corpus, phrase));
  for (const raw of tokenize(jobDescription)) {
    const key = raw.toLowerCase();
    if (STOP.has(key) || phrases.some((phrase) => phrase.split(" ").includes(key))) continue;
    const cur = counts.get(key);
    const display = cur && /[A-Z]/.test(cur.display) ? cur.display : raw;
    counts.set(key, { n: (cur?.n ?? 0) + 1, display });
  }
  const terms = [...counts.values()].map((v) => ({ ...v, score: v.n + (NAMED_SKILLS.has(v.display.toLowerCase()) || /[A-Z].*[A-Z]|[.+#]/.test(v.display) ? 2 : 0) }))
    .filter((v) => v.score >= 2).sort((a, b) => b.score - a.score).map((v) => v.display);
  return [...phrases, ...terms].slice(0, 30);
}

export function keywordMatch(jobDescription: string, r: Resume, explicitKeywords = "", uploadedText?: string): KeywordReport | null {
  const jd = jobDescription.trim();
  const explicit = explicitKeywords.split(/[,;\n]+/).map((term) => term.trim()).filter(Boolean);
  if (!explicit.length && jd.length < 40) return null;

  const ranked = [...new Map((explicit.length ? explicit : suggestKeywords(jd)).map((term) => [normaliseTerm(term), term])).values()].slice(0, 100);
  if (!ranked.length) return null;
  const resumeText = normaliseTerm(uploadedText ?? resumeToText(r));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const term of ranked) {
    (matchesNormalised(resumeText, term) ? matched : missing).push(term);
  }
  const total = matched.length + missing.length;
  return { matched, missing, coverage: total ? matched.length / total : 0 };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function resumeToText(r: Resume): string {
  const parts: string[] = [
    r.contact.fullName,
    r.contact.headline,
    r.summary,
    ...r.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
    ...r.education.flatMap((e) => [e.school, e.degree, e.field, ...e.details]),
    ...r.skills.flatMap((g) => [g.category, ...g.items]),
    ...r.projects.flatMap((p) => [p.name, p.tech, ...p.bullets]),
    ...r.certifications.flatMap((c) => [c.name, c.issuer]),
  ];
  return parts.filter(Boolean).join("\n");
}
