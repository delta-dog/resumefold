import { Fragment, type ReactNode } from "react";
import {
  orderedSections,
  sectionHasContent,
  SECTION_HEADINGS,
  type HtmlTemplateId,
  type Resume,
  type SectionId,
} from "@/lib/schema";
import { fmtRange, fmtMonth } from "@/lib/dates";
import { styleVars } from "./styles";

/**
 * Pure renderer: no hooks, no browser APIs, so the exact same component runs
 * in the live preview and inside react-dom/server for the PDF route.
 *
 * `data-field` attributes let the editor highlight the part of the sheet that
 * the focused input controls.
 */
export function ResumeDocument({
  resume,
  template,
  variant,
}: {
  resume: Resume;
  template?: HtmlTemplateId;
  /** Extra class for the approximate LaTeX-style previews, e.g. "tex-classic" */
  variant?: string;
}) {
  const t = variant ?? template ?? resume.meta.template;
  const paper = resume.meta.paper === "a4" ? " rs--a4" : "";
  return (
    <article className={`rs rs--${t}${paper}`} lang="en" style={variant ? undefined : styleVars(resume.meta.style)}>
      <Header resume={resume} />
      {orderedSections(resume)
        .filter((s) => sectionHasContent(resume, s))
        .map((s) => (
          <Section key={s} id={s} resume={resume} />
        ))}
    </article>
  );
}

function Header({ resume }: { resume: Resume }) {
  const c = resume.contact;
  const parts = [c.email, c.phone, c.location, c.website, c.linkedin, c.github].filter(Boolean);
  return (
    <header className="rs-head">
      <div>
        <h1 className="rs-name" data-field="contact.fullName">
          {c.fullName || "Your Name"}
        </h1>
        {c.headline && (
          <p className="rs-headline" data-field="contact.headline">
            {c.headline}
          </p>
        )}
      </div>
      {parts.length > 0 && (
        <p className="rs-contact" data-field="contact">
          {parts.map((p, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <>
                  {" "}
                  <span className="sep" aria-hidden="true">
                    ·
                  </span>{" "}
                </>
              )}
              <span className="item">{p}</span>
            </Fragment>
          ))}
        </p>
      )}
    </header>
  );
}

function Section({ id, resume }: { id: SectionId; resume: Resume }) {
  let body: ReactNode;
  switch (id) {
    case "summary":
      body = (
        <p className="rs-summary" data-field="summary">
          {resume.summary}
        </p>
      );
      break;
    case "experience":
      body = resume.experience.map((e) => (
        <div className="rs-entry" key={e.id} data-field={`experience.${e.id}`}>
          <div className="rs-row">
            <span className="rs-t">{e.title}</span>
            <span className="rs-r">{fmtRange(e.start, e.end, e.current)}</span>
          </div>
          <div className="rs-row">
            <span className="rs-sub">{e.company}</span>
            <span className="rs-r">{e.location}</span>
          </div>
          <Bullets items={e.bullets} />
        </div>
      ));
      break;
    case "education":
      body = resume.education.map((e) => (
        <div className="rs-entry" key={e.id} data-field={`education.${e.id}`}>
          <div className="rs-row">
            <span className="rs-t">{e.school}</span>
            <span className="rs-r">{fmtRange(e.start, e.end)}</span>
          </div>
          <div className="rs-row">
            <span className="rs-sub">
              {[e.degree, e.field].filter(Boolean).join(" in ")}
              {e.gpa ? `, GPA ${e.gpa}` : ""}
            </span>
            <span className="rs-r">{e.location}</span>
          </div>
          <Bullets items={e.details} />
        </div>
      ));
      break;
    case "skills":
      body = (
        <div className="rs-skills" data-field="skills">
          {resume.skills
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <p key={g.id}>
                {g.category && <b>{g.category}: </b>}
                {g.items.join(", ")}
              </p>
            ))}
        </div>
      );
      break;
    case "projects":
      body = resume.projects.map((p) => (
        <div className="rs-entry" key={p.id} data-field={`projects.${p.id}`}>
          <div className="rs-row">
            <span>
              <span className="rs-t">{p.name}</span>
              {p.tech && <span className="rs-sub"> | {p.tech}</span>}
            </span>
            <span className="rs-r">{fmtRange(p.start, p.end) || p.link}</span>
          </div>
          {p.link && (p.start || p.end) && <div className="rs-sub">{p.link}</div>}
          <Bullets items={p.bullets} />
        </div>
      ));
      break;
    case "certifications":
      body = resume.certifications.map((c) => (
        <div className="rs-row rs-cert" key={c.id} data-field={`certifications.${c.id}`}>
          <span>
            <span className="rs-t">{c.name}</span>
            {c.issuer && <span>, {c.issuer}</span>}
          </span>
          <span className="rs-r">{fmtMonth(c.date)}</span>
        </div>
      ));
      break;
  }
  return (
    <section className="rs-sec" data-sec={id}>
      <h2 className="rs-sec-h">{SECTION_HEADINGS[id]}</h2>
      {body}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  const list = items.filter((b) => b.trim());
  if (list.length === 0) return null;
  return (
    <ul>
      {list.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}
