# Contributing

Thanks for looking. This is a small, static TypeScript app. No backend, no database, no accounts. Getting a change from idea to running takes about a minute.

```bash
git clone https://github.com/delta-dog/resumefold.git
cd resumefold
npm install
npm run dev        # http://localhost:3000
npm run check      # lint + typecheck, run before you open a PR
```

## Where things live

| You want to… | Look in |
|---|---|
| Add or tweak an HTML layout | `src/lib/templates/html/styles.ts` (CSS) and `src/lib/templates/index.ts` (metadata) |
| Add a LaTeX style | `src/lib/templates/latex/*.ts`. Copy `banking.ts`, change the preamble, register it in `index.ts` and `schema.ts` |
| Add an ATS rule | `src/lib/ats/check.ts`. Push an `Issue` or a `Pass`; the UI renders whatever you return |
| Change the data model | `src/lib/schema.ts`. Zod schema; every renderer derives its type from here |
| Touch the wizard | `src/components/workspace/steps/*` |
| Touch the LaTeX studio | `src/components/latex/*` |
| Change copy | `src/app/page.tsx`, `src/lib/steps.ts`, `src/lib/templates/index.ts` |

## Ground rules

- **Everything single-column, text-only.** Layouts and exports must stay parser-safe. If a change adds a table, an image, a text box or a second column to an export, it needs a very good reason and an ATS-checker warning.
- **No AI features, no API keys.** The checker is rules. Keep it that way.
- **No backend.** The site must keep building with `output: "export"`. LaTeX compiles run in the browser; the remote fallback is opt-in and must keep asking first.
- **Verify exports.** `npm run tex:bundle` compiles every LaTeX style from the sample resume in the WebAssembly engine and rebuilds the bundle. If you add a package to a style, add it to `EXTRA_PACKAGES` in `scripts/tex/build-bundle.mjs`. For HTML layouts, use Save as PDF and confirm the text extracts in order.
- Keep PRs focused. One template, one rule, one fix.
- Update `src/lib/changelog.ts` with every user-facing change. Put the newest month and release first, use `YYYY-MM` for the month and `YYYY-MM-DD` for the date, and group related changes under a version matching `package.json`. Write a short explanation of what changed for users. The `/changelog/` page renders each month as an H2 and each release number as an H3.

## Licensing of templates

The LaTeX styles are original. Don't paste code from other resume templates, whatever their license; write it fresh, with our macro names. Anything third-party we ship goes in THIRD_PARTY_NOTICES.md.
