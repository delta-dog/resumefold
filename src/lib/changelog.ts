export type ChangelogMonth = {
  month: string;
  entries: { version: string; date: string; changes: string[] }[];
};

export const CHANGELOG: ChangelogMonth[] = [
  {
    month: "2026-09",
    entries: [
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
