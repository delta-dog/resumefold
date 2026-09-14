# ResumeFold

Browser support and device-specific handling are documented in [docs/browser-compatibility.md](docs/browser-compatibility.md).

**A free, open-source resume builder. It gets you past applicant tracking systems and still sounds like you.**

Upload an existing PDF, DOCX or TXT, or type your details once. Review the live preview, run the ATS check, then export an ATS-friendly **PDF** or **DOCX**, or open the same resume in **Overleaf** as LaTeX. No account, no AI, no server. It's a static site; your drafts live in your browser.

## Try it

```bash
npm install
npm run dev
```

Open http://localhost:3000. That's the whole setup.

```bash
npm run build         # static site → ./out  (deploy anywhere: GitHub Pages, Netlify, Vercel, S3)
npm run check         # lint + typecheck
npm test              # import, matching and draft persistence checks
npm run tex:bundle    # build the in-browser TeX engine bundle into public/tex/ (one-time, ~250 MB download, cached)
```

## What it does

- **Local resume uploads:** PDF, DOCX and TXT extraction into a new draft, with editable text, import notes and a comparison against the original uploaded text. [Limits and matching rules](docs/resume-import.md).
- **Saved job targets:** job descriptions and editable keywords stay with each draft across steps and JSON backups. A playful session nickname stays out of resume exports.
- **Live preview** of a real Letter/A4 sheet as you type, with the field you're editing spotlighted on the page.
- **Four single-column layouts** (Standard, Student, Combination, Senior), each tunable: typeface pairing, size, margins, line spacing, accent colour, custom CSS.
- **ATS checker** that names the problem ("Role 2 is missing an end date", "three bullets open with *responsible for*") and links each finding to the field that fixes it. Paste a job description for a verbatim keyword-gap list.
- **Exports that agree with each other:** PDF (printed from the preview itself), DOCX (real Word heading styles, tab-stop dates, no tables), and LaTeX.
- **LaTeX studio:** an Overleaf-style editor with a file tree, outline, toolbar, autocomplete, lint-gutter errors, and a pdf.js viewer with page navigation and zoom. Recompile or auto-compile. Or press **Open in Overleaf** and continue there.
- **Four LaTeX styles** (Classic, Bold, Banking, Two-column), written from scratch. One self-contained `.tex` each.
- Light, dark and system themes. Multiple named drafts. JSON import/export.
- A monthly changelog at `/changelog/`, updated through `src/lib/changelog.ts`.
- Locally bundled interface, heading, editor and resume fonts, with no font-service requests in the browser.

## How it's built (no backend)

```
src/lib/schema.ts              Zod schema, the single source of truth for a resume
src/lib/store.ts               Zustand + localStorage; multiple named drafts
src/lib/templates/html/        ResumeDocument (pure React) + CSS shared by preview and print
src/lib/templates/latex/       classic / bold / banking / columns → .tex strings
src/lib/export/                pdf.ts (hidden-iframe print), docx.ts, download.ts (zip + Overleaf form)
src/lib/ats/check.ts           ATS rules engine + keyword matcher
src/lib/latex/                 local.ts (WebAssembly pdfTeX worker client), compile.ts (remote fallback), log.ts (errors → line numbers)
public/tex/tex-worker.js       the in-browser TeX engine worker (bundle built by scripts/tex/build-bundle.mjs)
src/components/workspace/      the wizard, rail, live preview, style panel
src/components/latex/          the studio, CodeMirror editor, pdf.js viewer
```

- **PDF** is the browser's own print-to-PDF of the preview markup, with `@page` size and zero margins set. Real text, correct read order, nothing uploaded.
- **LaTeX compiles run in the browser.** `npm run tex:bundle` downloads [BusyTeX](https://github.com/busytex/busytex) (pdfTeX compiled to WebAssembly, MIT) and its TeX Live tree, compiles the four sample resumes with `-recorder` to learn exactly which files TeX touches, and packs only those into `public/tex/` (about 13 MB of tree + 30 MB engine). The worker in `public/tex/tex-worker.js` loads it once (Cache API) and runs `pdflatex` locally; nothing leaves the machine. If the bundle isn't deployed, the studio falls back to [LaTeX-On-HTTP](https://github.com/YtoTech/latex-on-http) (latex.ytotech.com), and asks first because the source leaves the browser.
- **Open in Overleaf** uses Overleaf's documented link integration (`POST https://www.overleaf.com/docs` with `encoded_snip`), so the whole project rides in the form body.

## Deploying

`next build` writes a static site to `out/`. The browser TeX engine and trimmed runtime bundle are included in `public/tex/`, so a normal build includes local compilation. Run `npm run tex:bundle` when changing the TeX packages or rebuilding the engine.

For Vercel, import the repository using the Next.js preset. `vercel.json` supplies `npm run build`; leave the output directory automatic and `BASE_PATH` unset. The project checks workflow runs lint, type checks and a production build for pushes and pull requests. The optional `pages.yml` workflow deploys to GitHub Pages only when started manually, setting `BASE_PATH=/<repo>` and the public site URL for project pages. It uses the bundled TeX runtime without downloading TeX packages. In repository Settings → Pages, select GitHub Actions; then run Deploy to GitHub Pages from the Actions tab.

On Vercel, the canonical URL and Open Graph metadata use the production domain automatically. For another host, set `NEXT_PUBLIC_SITE_URL` to the public site URL during the build. Set `repo` in `src/lib/site.ts` to show the source link in the footer and FAQ.

## The ATS-safe ruleset

Compiled from 2025–26 guidance on Workday, Taleo, iCIMS, Greenhouse and Lever. Greenhouse and Lever are lenient; Workday, Taleo and iCIMS are not, so the exports satisfy the strictest.

**Guaranteed by construction**

| # | Rule | Why |
|---|---|---|
| A1 | Single column. No sidebars, no two-column skills grids. | Workday/Taleo read columns out of order. |
| A2 | No tables or text boxes for layout. | Cells get concatenated; text-box content is skipped. |
| A4 | Contact details in the page body, never a header/footer. | Many parsers strip headers/footers. |
| A5 | No images, icons, logos, photos, skill bars. | Zero extractable text. |
| A6 | Standard headings: Work Experience, Education, Skills, Projects, Certifications, Summary. | Taleo has the narrowest heading dictionary. |
| A7 | Text-selectable, Unicode-mapped PDF (`\pdfgentounicode=1` in LaTeX). | |
| B3 | Standard embedded fonts at 10–12 pt; heading letter-spacing ≤ 0.09 em. | Wide tracking makes extractors insert spaces inside words. |
| B4 | Plain `•` bullets. | |
| B6 | Skills as labelled lines, not a grid. | |

**Checked against your content**

| # | Rule |
|---|---|
| B1 | One date format everywhere; end after start. |
| B2 | Every role has title, employer, location, dates; every school has school + degree. |
| B5 | No arrows, stars, emoji in text. |
| C | Name, valid email, 10-digit phone, city present. Reverse-chronological order. |
| Q | Bullets: no weak openers, under ~35 words, ≥ 40 % quantified. Length by seniority. |
| B7 | Filename `Firstname-Lastname-Resume.pdf`; DOCX offered for older portals. |
| B8 | Keyword match against a pasted job description. |

Score: 100 − 18 per fail − 7 per warning − 3 per tip. "Ready to send" needs ≥ 85 and zero fails.

## Templates

Four LaTeX styles, all original: Classic, Bold, Banking, and Two-column (the last is for human readers only; the checker warns when it's selected). Each is a single self-contained `.tex` that compiles with `pdflatex` in the browser, on a stock TeX Live, or in Overleaf.

Third-party components we ship (the TeX engine, fonts, pdf.js, CodeMirror) and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: `npm run dev`, keep everything single-column and text-only, no backend, no AI, one focused change per PR.

## License

[MIT](LICENSE).
