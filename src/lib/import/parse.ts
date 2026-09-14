import { nanoid } from "nanoid";
import { emptyResume, type Resume } from "@/lib/schema";

type Section = "summary" | "experience" | "education" | "skills" | "projects" | "certifications";
const HEADINGS: Record<string, Section> = {
  summary: "summary", profile: "summary", "professional summary": "summary", objective: "summary", "career objective": "summary", "about me": "summary",
  experience: "experience", "work experience": "experience", "professional experience": "experience", employment: "experience", "employment history": "experience", "career history": "experience", "work history": "experience",
  education: "education", qualifications: "education", "academic background": "education",
  skills: "skills", "technical skills": "skills", "core skills": "skills", "core competencies": "skills", technologies: "skills", "skills and tools": "skills",
  projects: "projects", "personal projects": "projects", "selected projects": "projects",
  certifications: "certifications", certificates: "certifications", "licenses and certifications": "certifications",
};
const BULLET = /^\s*[-•●▪◦*]\s*/;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE = "(?:[A-Za-z]{3,9}\\.?\\s+\\d{4}|\\d{4}[-/]\\d{1,2}|\\d{1,2}/\\d{4}|\\d{4}|Present|Current|Now)";
const RANGE = new RegExp(`(${DATE})\\s*(?:[-–—]|to)\\s*(${DATE})`, "i");
const ROLE = /engineer|developer|manager|analyst|designer|lead|intern|consultant|director|specialist|assistant|officer|associate|coordinator|architect|scientist|accountant|nurse|teacher|technician/i;

export function parseImportDate(raw: string) {
  const text = raw.trim().toLowerCase();
  const monthName = text.match(/^([a-z]+)\.?\s+(\d{4})$/);
  let year = "", month = 0;
  if (monthName) { year = monthName[2]; month = MONTHS.indexOf(monthName[1].slice(0, 3)) + 1; }
  else {
    const yearFirst = text.match(/^(\d{4})[-/](\d{1,2})$/);
    const monthFirst = text.match(/^(\d{1,2})\/(\d{4})$/);
    if (yearFirst) { year = yearFirst[1]; month = Number(yearFirst[2]); }
    else if (monthFirst) { year = monthFirst[2]; month = Number(monthFirst[1]); }
  }
  return year && month >= 1 && month <= 12 ? `${year}-${String(month).padStart(2, "0")}` : "";
}

function heading(line: string) { return HEADINGS[line.toLowerCase().replace(/[&]/g, "and").replace(/[:\s]+$/g, "").trim()]; }
function clean(line: string) { return line.replace(BULLET, "").trim(); }
function splitHeader(lines: string[]) { return lines.flatMap((line) => line.split(/\s*[|\t]\s*|\s+at\s+|\s+@\s+/)).map(clean).filter(Boolean); }

export function parseResumeText(text: string, filename = ""): Resume {
  const r = emptyResume();
  const warnings = new Set<string>(["Check the extracted fields before exporting. Original layout and styling are not retained."]);
  const unassigned: string[] = [];
  const sections: Record<Section, string[]> = { summary: [], experience: [], education: [], skills: [], projects: [], certifications: [] };
  const header: string[] = [];
  let section: Section | null = null;
  let unsupported = false;
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const next = heading(line);
    if (next) { section = next; unsupported = false; continue; }
    if (/^(languages|interests|hobbies|awards|publications|volunteering|volunteer experience|achievements|references|additional information):?$/i.test(line)) {
      unsupported = true; section = null; unassigned.push(line); continue;
    }
    if (unsupported) { if (line) unassigned.push(line); }
    else if (section) sections[section].push(line);
    else if (line) header.push(line);
  }

  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = header.join(" ").match(/(?:\+?\d[\d ()-]{6,}\d)/)?.[0]?.trim() ?? "";
  r.contact.email = email;
  r.contact.phone = phone;
  const links = [...text.matchAll(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/)[\w.-]+\/?/gi)].map((match) => match[0]);
  r.contact.linkedin = links.find((link) => /linkedin/i.test(link)) ?? "";
  r.contact.github = links.find((link) => /github/i.test(link)) ?? "";
  r.contact.website = header.join(" ").match(/https?:\/\/[^\s|,]+/g)?.find((link) => !/linkedin\.com|github\.com/i.test(link)) ?? "";
  const nameIndex = header.findIndex((line) => line.length < 70 && /^[\p{L}][\p{L} .'-]+$/u.test(line) && line.split(/\s+/).length >= 2 && !ROLE.test(line) && !/resume|curriculum vitae/i.test(line));
  if (nameIndex >= 0) r.contact.fullName = header[nameIndex];
  else warnings.add("The name could not be identified confidently. Fill it in under Basics.");
  header.forEach((line, index) => {
    if (index === nameIndex) return;
    const parts = line.split(/[|\t]/).map((part) => part.trim()).filter(Boolean);
    for (const part of parts) {
      if ((email && part.includes(email)) || (phone && part.includes(phone)) || /linkedin\.com|github\.com|https?:\/\//i.test(part)) continue;
      if (!r.contact.headline && ROLE.test(part) && part.length < 100) r.contact.headline = part;
      else if (!r.contact.location && /^[\p{L} .'-]+,\s*[\p{L} .'-]+$/u.test(part)) r.contact.location = part;
      else unassigned.push(part);
    }
  });
  r.summary = sections.summary.filter(Boolean).map(clean).join(" ");

  for (const line of sections.skills.filter(Boolean)) {
    const colon = line.indexOf(":");
    const category = colon > 0 && colon < 50 ? line.slice(0, colon) : "Skills";
    const items = clean(colon > 0 && colon < 50 ? line.slice(colon + 1) : line).split(/[,;|•]+/).map((item) => item.trim()).filter(Boolean);
    if (items.length) r.skills.push({ id: nanoid(10), category, items });
  }

  for (const kind of ["experience", "education", "projects"] as const) {
    let pending: string[] = [];
    let active: { header: string[]; bullets: string[]; start: string; end: string; current: boolean } | null = null;
    const finish = () => {
      if (!active) return;
      const parts = splitHeader(active.header);
      if (!parts.length) { unassigned.push(...active.bullets); active = null; return; }
      const { start, end, current, bullets } = active;
      if (kind === "experience") {
        const titleIndex = parts.findIndex((part) => ROLE.test(part));
        const title = titleIndex >= 0 ? parts[titleIndex] : parts[0];
        const company = parts.find((_, index) => index !== (titleIndex >= 0 ? titleIndex : 0)) ?? "";
        r.experience.push({ id: nanoid(10), title, company, location: "", start, end, current, bullets });
        if (!company) warnings.add("Some employers need checking under Experience.");
        unassigned.push(...parts.filter((part) => part !== title && part !== company));
      } else if (kind === "education") {
        const degreeIndex = parts.findIndex((part) => /bachelor|master|doctor|ph\.?d|b\.?s\.?c?|m\.?s\.?c?|b\.?a\.?|mba|diploma|certificate/i.test(part));
        const degree = degreeIndex >= 0 ? parts[degreeIndex] : "";
        const school = parts.find((_, index) => index !== degreeIndex) ?? "";
        r.education.push({ id: nanoid(10), school, degree, field: "", location: "", start, end, gpa: "", details: bullets });
        unassigned.push(...parts.filter((part) => part !== degree && part !== school));
      } else {
        r.projects.push({ id: nanoid(10), name: parts[0], link: "", tech: parts.slice(1).join(", "), start, end, bullets });
      }
      active = null;
    };
    for (const line of sections[kind]) {
      if (!line) continue;
      const range = line.match(RANGE);
      if (range) {
        finish();
        const title = line.replace(range[0], "").replace(/^[|,\s-]+|[|,\s-]+$/g, "");
        const current = /present|current|now/i.test(range[2]);
        const start = parseImportDate(range[1]), end = current ? "" : parseImportDate(range[2]);
        if (!start || (!current && !end)) { warnings.add("Dates without a recognised month are left blank. Check them against the original text."); unassigned.push(line); }
        active = { header: [...pending, ...(title ? [title] : [])], bullets: [], start, end, current };
        pending = [];
      } else if (BULLET.test(line) && active) {
        if (pending.length) { active.bullets.push(...pending.map(clean)); pending = []; }
        active.bullets.push(clean(line));
      } else if (active && !pending.length && !active.bullets.length && active.header.length < 2) {
        active.header.push(line);
      } else pending.push(line);
    }
    if (active) { active.bullets.push(...pending.map(clean)); pending = []; finish(); }
    else if (pending.length) {
      if (kind === "education") r.education.push({ id: nanoid(10), school: pending[0], degree: pending.slice(1).join(" "), field: "", location: "", start: "", end: "", gpa: "", details: [] });
      else if (kind === "projects") r.projects.push({ id: nanoid(10), name: pending[0], link: "", tech: "", start: "", end: "", bullets: pending.slice(1).map(clean) });
      else { unassigned.push(...pending); warnings.add("Experience without clear date ranges is saved as unassigned text. Place it in the right fields before exporting."); }
    }
  }
  for (const line of sections.certifications.filter(Boolean)) r.certifications.push({ id: nanoid(10), name: clean(line), issuer: "", date: "", link: "" });
  r.meta.imported = { filename, text, unassigned: [...new Set(unassigned)].join("\n"), warnings: [...warnings] };
  if (r.meta.imported.unassigned) r.meta.imported.warnings.push("Some text could not be assigned to a field. It is kept in Import notes for review.");
  return r;
}
