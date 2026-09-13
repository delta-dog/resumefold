import type { NextConfig } from "next";

/**
 * Fully static: no API routes, no server. `next build` writes ./out, which any
 * static host (GitHub Pages, Netlify, Vercel, S3) can serve.
 *
 * BASE_PATH lets the same build live under a sub-path, e.g. GitHub project
 * pages at https://<user>.github.io/<repo>/ → BASE_PATH=/<repo>.
 */
const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
  // Hide the floating "N" dev-tools button in `next dev`.
  devIndicators: false,
};

export default nextConfig;
