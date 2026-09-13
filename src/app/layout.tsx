import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { SITE } from "@/lib/site";

const googleSans = localFont({
  src: "./fonts/google-sans-latin.woff2",
  variable: "--font-google-sans",
  weight: "400 700",
  display: "swap",
});
const googleSansCode = localFont({
  src: "./fonts/google-sans-code-latin.woff2",
  variable: "--font-google-sans-code",
  weight: "300 800",
  display: "swap",
});
const headingFont = localFont({
  src: "./fonts/inter-variable.woff2",
  variable: "--font-heading",
  weight: "400 800",
  display: "swap",
});

const description =
  "Free ATS-friendly resume builder. Live preview, a checker that names what to fix, and exports to PDF, DOCX and LaTeX you can open in Overleaf. Open source. No sign-up.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: free ATS-friendly resume builder with LaTeX and Overleaf export`,
    template: `%s · ${SITE.name}`,
  },
  description,
  keywords: [
    "resume builder",
    "free resume builder",
    "ATS resume builder",
    "ATS-friendly resume template",
    "resume checker",
    "ATS resume checker",
    "LaTeX resume template",
    "Overleaf resume",
    "CV builder",
    "resume to PDF",
    "resume to DOCX",
    "open source resume builder",
    "resume builder no sign up",
  ],
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name}: a resume that gets past the robots and still sounds like you`,
    description,
    url: SITE.url,
  },
  twitter: { card: "summary_large_image", title: `${SITE.name}: free ATS-friendly resume builder`, description },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#202124" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${googleSans.variable} ${googleSansCode.variable} ${headingFont.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
