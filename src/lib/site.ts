/** One place for the facts the copy and metadata refer to. Edit before you deploy. */
const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const publicUrl = process.env.NEXT_PUBLIC_SITE_URL || (deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000");

export const SITE = {
  name: "ResumeFold",
  tagline: "Free, open-source resume builder. Gets past applicant tracking systems and still sounds like you.",
  /** Public URL of the deployed site (no trailing slash). Used for canonical / Open Graph. */
  url: new URL(publicUrl).origin,
  /** Source repository. Shown in the footer and FAQ; leave empty to hide. */
  repo: "https://github.com/delta-dog/resumefold",
  license: "MIT",
  /** Copyright holder shown in the footer. Put your name or company here. */
  owner: "ResumeFold",
  /** First year of publication; the footer shows "2026" or "2026–2027" automatically. */
  since: 2026,
};
