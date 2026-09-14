export type ChangelogMonth = {
  month: string;
  entries: { version: string; date: string; changes: string[] }[];
};

export const CHANGELOG: ChangelogMonth[] = [
  {
    month: "2026-09",
    entries: [
      {
        version: "0.3.2",
        date: "2026-09-14",
        changes: [
          "Added missing PDF compatibility support in both the reader and its worker for browsers without newer promise and buffer APIs.",
          "Reworked file reading with cancellable native reads and clearer guidance for files unavailable on the device.",
          "Added resume text paste with the same review, keyword matching and export flow.",
          "Added optional error details and versioned PDF worker assets to help diagnose failures and avoid stale worker caches.",
        ],
      },
      {
        version: "0.3.1",
        date: "2026-09-14",
        changes: [
          "Fixed mobile PDF uploads by using the PDF reader and worker with browser compatibility support.",
          "Kept file cancellation compatible with older browsers and replaced raw browser errors with useful guidance.",
          "Kept the editor usable when browser storage is blocked, full or unreadable, with a visible backup reminder.",
          "Improved tablet touch controls, landscape safe areas and text sizing across devices.",
          "Reduced PDF preview memory use by rendering nearby pages and cleaning up replaced documents.",
          "Improved mobile download handling and respected reduced-motion settings in previews.",
        ],
      },
      {
        version: "0.3.0",
        date: "2026-09-14",
        changes: [
          "Added local PDF, DOCX and TXT resume uploads with editable extracted text, new drafts and import notes.",
          "Saved job targets, postings, keywords and comparison sources with each draft, including JSON backups.",
          "Improved job-specific matching for phrases, common abbreviations and whole terms, with an option to analyse the original uploaded text.",
          "Added a playful nickname that stays with the browser session and never appears in exported resumes.",
          "Made mobile template selection advance directly to Basics.",
          "Improved navbar section tracking during scrolling and softened long section transitions.",
        ],
      },
      {
        version: "0.2.2",
        date: "2026-09-13",
        changes: [
          "Set the default public URL to the GitHub Pages site for canonical links, Open Graph metadata and structured data.",
        ],
      },
      {
        version: "0.2.1",
        date: "2026-09-13",
        changes: [
          "Fixed GitHub Pages deployment by using the included TeX runtime instead of downloading and rebuilding it.",
          "Updated project Actions and corrected public URLs for hosting under a repository path.",
        ],
      },
      {
        version: "0.2.0",
        date: "2026-09-13",
        changes: [
          "Renamed the site and project to ResumeFold, including documentation and export labels.",
          "Reduced mobile navigation to one compact row, keeping appearance controls visible and placing section links in a menu.",
          "Added this changelog, grouped by month and release number.",
          "Bundled heading, interface, editor and resume fonts locally for consistent typography across devices.",
          "Changed primary buttons to black and introduced bold headings and neutral selection colours.",
          "Reviewed the project files and mobile layouts and made PDF printing wait for the resume font stylesheet.",
          "Included the browser TeX runtime in the project and added Vercel configuration and automatic project checks.",
          "Made compilation manual by default on mobile, devices with limited memory or processor cores, and data-saving connections.",
        ],
      },
      {
        version: "0.1.0",
        date: "2026-09-13",
        changes: [
          "Built the resume wizard, live preview, four single-column layouts and rules-based ATS checker.",
          "Added PDF, DOCX, LaTeX and Overleaf exports, with a browser-based LaTeX editor and compiler.",
          "Added saved drafts, JSON backups and light, dark and system themes.",
          "Improved mobile forms, previews and studio panels, with shorter landing-page copy and collapsible FAQs.",
          "Kept the navigation visible while scrolling and added cancellable section scrolling and active-link tracking.",
          "Simplified the mobile appearance menu to Light and Dark and changed the sample identity to John Doe.",
          "Removed unused files and generated build clutter, and added licensing, contribution guidance and static hosting configuration.",
        ],
      },
    ],
  },
];
