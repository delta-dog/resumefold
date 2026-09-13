# Third-party notices

ResumeFold's own code is MIT licensed (see LICENSE). The deployed site also ships the components below. Their licenses require that these notices travel with the software; this file is that notice. Nothing here is a dependency you need to think about as a user.

## Shipped in the page

| Component | What it does here | License |
|---|---|---|
| [Next.js](https://nextjs.org) / [React](https://react.dev) | the application framework | MIT |
| [CodeMirror 6](https://codemirror.net) (`@codemirror/*`, `@lezer/*`) | the LaTeX studio's editor | MIT |
| [pdf.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) | renders compiled PDFs in the studio | Apache-2.0 |
| [docx](https://github.com/dolanmiu/docx) | builds the DOCX export | MIT |
| [JSZip](https://stuk.github.io/jszip/) | builds the .zip export | MIT or GPL-3.0 (used under MIT) |
| [Zod](https://zod.dev), [Zustand](https://zustand.docs.pmnd.rs), [Immer](https://immerjs.github.io/immer/), [nanoid](https://github.com/ai/nanoid) | data model and state | MIT |
| [Google Sans](https://fonts.google.com/specimen/Google+Sans), [Google Sans Code](https://fonts.google.com/specimen/Google+Sans+Code) | locally bundled interface typefaces; license notices in `src/app/fonts/` | SIL Open Font License 1.1 |
| [Inter](https://rsms.me/inter/) | locally bundled heading typeface; license notice in `src/app/fonts/` | SIL Open Font License 1.1 |
| [Source Sans 3](https://github.com/adobe-fonts/source-sans), [Source Serif 4](https://github.com/adobe-fonts/source-serif), [Lato](https://www.latofonts.com) | locally bundled resume preview and PDF typefaces; license notices in `public/fonts/` | SIL Open Font License 1.1 |

## The in-browser TeX engine (`public/tex/`)

Built by `scripts/tex/build-bundle.mjs`; not committed to the repository.

| Component | License |
|---|---|
| [BusyTeX](https://github.com/busytex/busytex): pdfTeX and friends compiled to WebAssembly. The build scripts are MIT; the binary contains TeX Live programs under their own free licenses (listed below). | MIT (scripts) |
| [TeX Live 2023](https://tug.org/texlive/) programs and macro packages: pdfTeX, kpathsea, LaTeX2e, `geometry`, `hyperref`, `titlesec`, `enumitem`, `paracol`, `xcolor`, `microtype`, `xkeyval`, `fontaxes`, `ly1`, and their dependencies | Free licenses per package: LPPL 1.3c, GPL, MIT, public domain. See each package's documentation on [CTAN](https://ctan.org). |
| [Latin Modern](https://www.gust.org.pl/projects/e-foundry/latin-modern) fonts | GUST Font License |
| [Source Sans 3](https://github.com/adobe-fonts/source-sans) (`sourcesans`) | SIL Open Font License 1.1 |
| [Lato](https://www.latofonts.com) (`lato`) | SIL Open Font License 1.1 |
| Bitstream Charter (`charter`) | Bitstream Charter license (free redistribution; see `fonts/type1/bitstrea/charter/readme` in TeX Live) |
| AMS fonts | SIL Open Font License 1.1 |

## Optional remote compile fallback

If the engine bundle isn't deployed, the studio can send LaTeX source to [LaTeX-On-HTTP](https://github.com/YtoTech/latex-on-http) (AGPL-3.0, public instance at latex.ytotech.com). It is called over HTTP and never bundled; it asks the user first.

## Trademarks

Overleaf, Workday, Taleo, iCIMS, Greenhouse and Lever are trademarks of their respective owners. ResumeFold is independent and not affiliated with or endorsed by any of them.
