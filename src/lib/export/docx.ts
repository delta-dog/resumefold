import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx";
import { orderedSections, sectionHasContent, SECTION_HEADINGS, type Resume, type SectionId } from "@/lib/schema";
import { fmtMonth, fmtRange } from "@/lib/dates";

/**
 * ATS-safe DOCX: one column, real Word heading styles (parsers key on them),
 * right-aligned dates via a tab stop (never a table), plain bullets, Calibri.
 */
export async function renderDocx(r: Resume): Promise<Blob> {
  const st = r.meta.style;
  const serifBody = st.font === "serif" || r.meta.template === "student";
  const font = serifBody ? "Georgia" : "Calibri";
  const headFont = st.font === "sans" ? "Calibri" : "Georgia";
  const base = Math.round(Number(st.size) * 2); // half-points
  const pageW = r.meta.paper === "a4" ? 11906 : 12240; // twips
  const pageH = r.meta.paper === "a4" ? 16838 : 15840;
  const margin = 1000; // ~0.7in
  const textW = pageW - margin * 2;

  const rule = { bottom: { style: BorderStyle.SINGLE, size: 6, color: "222222", space: 1 } };
  const rightTab = [{ type: TabStopType.RIGHT, position: textW }];

  const children: Paragraph[] = [];

  // Header (in the body, never the page header — ATS rule A4)
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: r.contact.fullName || "Your Name", bold: true, size: base * 2 + 2, font: headFont })],
      spacing: { after: 40 },
    }),
  );
  if (r.contact.headline)
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: r.contact.headline, size: base + 1, font, color: "444444" })],
        spacing: { after: 40 },
      }),
    );
  const c = r.contact;
  const parts = [c.email, c.phone, c.location, c.website, c.linkedin, c.github].filter(Boolean);
  if (parts.length)
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: parts.join("  |  "), size: base - 2, font })],
        spacing: { after: 160 },
      }),
    );

  const heading = (id: SectionId) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      border: rule,
      children: [new TextRun({ text: SECTION_HEADINGS[id].toUpperCase(), bold: true, size: base, font: headFont, characterSpacing: 20 })],
      spacing: { before: 200, after: 80 },
    });

  const row = (left: TextRun[], right: string, after = 0) =>
    new Paragraph({
      tabStops: rightTab,
      children: [...left, new TextRun({ text: `\t${right}`, size: base - 1, font, color: "444444" })],
      spacing: { after },
    });

  const bullets = (items: string[]) =>
    items
      .filter((b) => b.trim())
      .map(
        (b) =>
          new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children: [new TextRun({ text: b, size: base, font })],
            spacing: { after: 30 },
          }),
      );

  for (const id of orderedSections(r)) {
    if (!sectionHasContent(r, id)) continue;
    children.push(heading(id));
    switch (id) {
      case "summary":
        children.push(new Paragraph({ children: [new TextRun({ text: r.summary, size: base, font })], spacing: { after: 60 } }));
        break;
      case "experience":
        for (const e of r.experience) {
          children.push(row([new TextRun({ text: e.title, bold: true, size: base + 1, font })], fmtRange(e.start, e.end, e.current)));
          children.push(row([new TextRun({ text: e.company, italics: true, size: base, font })], e.location, 40));
          children.push(...bullets(e.bullets));
          children.push(new Paragraph({ spacing: { after: 60 } }));
        }
        break;
      case "education":
        for (const e of r.education) {
          const deg = [e.degree, e.field].filter(Boolean).join(" in ") + (e.gpa ? `, GPA ${e.gpa}` : "");
          children.push(row([new TextRun({ text: e.school, bold: true, size: base + 1, font })], fmtRange(e.start, e.end)));
          children.push(row([new TextRun({ text: deg, italics: true, size: base, font })], e.location, 40));
          children.push(...bullets(e.details));
          children.push(new Paragraph({ spacing: { after: 60 } }));
        }
        break;
      case "skills":
        for (const g of r.skills.filter((x) => x.items.length))
          children.push(
            new Paragraph({
              children: [
                ...(g.category ? [new TextRun({ text: `${g.category}: `, bold: true, size: base, font })] : []),
                new TextRun({ text: g.items.join(", "), size: base, font }),
              ],
              spacing: { after: 40 },
            }),
          );
        break;
      case "projects":
        for (const p of r.projects) {
          children.push(
            row(
              [
                new TextRun({ text: p.name, bold: true, size: base + 1, font }),
                ...(p.tech ? [new TextRun({ text: ` | ${p.tech}`, italics: true, size: base, font })] : []),
              ],
              fmtRange(p.start, p.end) || p.link,
              40,
            ),
          );
          children.push(...bullets(p.bullets));
          children.push(new Paragraph({ spacing: { after: 60 } }));
        }
        break;
      case "certifications":
        for (const ct of r.certifications)
          children.push(
            row(
              [
                new TextRun({ text: ct.name, bold: true, size: base, font }),
                ...(ct.issuer ? [new TextRun({ text: `, ${ct.issuer}`, size: base, font })] : []),
              ],
              fmtMonth(ct.date),
              40,
            ),
          );
        break;
    }
  }

  const doc = new Document({
    creator: "ResumeFold",
    title: `${r.contact.fullName}, Resume`,
    styles: {
      default: { document: { run: { font, size: base } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", run: { font: headFont, size: base * 2 + 2, bold: true } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: headFont, size: base, bold: true } },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { size: { width: pageW, height: pageH }, margin: { top: margin, right: margin, bottom: margin, left: margin } },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
