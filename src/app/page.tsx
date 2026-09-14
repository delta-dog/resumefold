import Link from "next/link";
import { Thumbnail } from "@/components/workspace/Thumbnail";
import { FloatingNav } from "@/components/ui/FloatingNav";
import { sampleResume } from "@/lib/sample";
import { HTML_TEMPLATES, LATEX_STYLES } from "@/lib/templates";
import { RESUME_CSS, RESUME_FONTS_URL } from "@/lib/templates/html/styles";
import { SITE } from "@/lib/site";

/*
 * Landing copy. Voice: direct, warm, a bit wry. Short sentences. Second person.
 * No em dashes anywhere. Keywords we want to rank for appear naturally:
 * resume builder, ATS-friendly resume, free resume builder no sign-up,
 * LaTeX resume, Overleaf, resume checker, PDF, DOCX, open source.
 */

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can I upload my existing resume?",
    a: "Yes. Upload a PDF, DOCX or TXT in the builder, review the extracted fields, then compare it with a job posting and export. Reading happens on this device. Scanned PDFs need selectable text first.",
  },
  {
    q: "Is it free?",
    a: "Yes. Every layout and export is free, with no trial, subscription or watermark.",
  },
  {
    q: "Do I need an account?",
    a: "No. Drafts save in this browser. Export a JSON backup to move them to another device.",
  },
  {
    q: "What makes a resume ATS-friendly?",
    a: "One column, clear section names and selectable text. Use the checker to catch missing details and weak bullets before exporting.",
  },
  {
    q: "Does it write my resume?",
    a: "No. You write it. The checker uses rules to suggest improvements, without AI or generated text.",
  },
  {
    q: "Can I use Overleaf?",
    a: "Yes. Choose a LaTeX style, then open your resume in Overleaf. You can also edit and compile it here.",
  },
  {
    q: "Where is my data stored?",
    a: "Drafts and exports stay in your browser. Source is sent out only if you choose Overleaf or approve the optional remote LaTeX compiler.",
  },
  {
    q: "Can I contribute?",
    a: "Yes. ResumeFold is open source. See CONTRIBUTING.md for setup and ways to help.",
  },
];

const RULES: [string, string][] = [
  ["One column", "Sidebars and two-column skills grids read out of order in Workday and Taleo."],
  ["No tables or text boxes", "Cells get mashed into one string. Text-box contents are often skipped entirely."],
  ["Contact details in the body", "Many parsers strip page headers and footers. Put your email where they can find it."],
  ["Standard section names", "“Work Experience”, “Education”, “Skills”. Not “Where I’ve Been”."],
  ["Real text, real fonts", "No icons standing in for labels, no text as an image, no wide letter-spacing that splits words."],
  ["Consistent dates", "One format everywhere. Parsers work out your tenure from them."],
];

export default function Home() {
  const thisYear = new Date().getFullYear();
  const years = thisYear > SITE.since ? `${SITE.since}–${thisYear}` : String(SITE.since);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: SITE.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: SITE.tagline,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        url: SITE.url,
        ...(SITE.repo ? { codeRepository: SITE.repo } : {}),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <div className="device-safe min-h-dvh">
      <link rel="stylesheet" href={RESUME_FONTS_URL} />
      <style dangerouslySetInnerHTML={{ __html: RESUME_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header: one persistent floating pill that condenses as you scroll */}
      <FloatingNav
        brand={SITE.name}
        items={[
          { href: "#ats", label: "ATS checker" },
          { href: "#templates", label: "Templates" },
          { href: "#latex", label: "LaTeX" },
          { href: "#why", label: "Why" },
          { href: "#faq", label: "FAQ" },
        ]}
        cta={{ href: "/build", label: "Build my resume" }}
      />

      <main className="mx-auto max-w-[1440px] px-4 pt-[calc(80px+env(safe-area-inset-top))] sm:px-6 lg:pt-[76px] [&_[id]]:scroll-mt-[calc(80px+env(safe-area-inset-top))] lg:[&_[id]]:scroll-mt-24">
        {/* Hero */}
        <section className="tile mt-3 grid min-w-0 grid-cols-1 items-center gap-8 overflow-hidden px-5 py-8 sm:mt-6 sm:gap-10 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:px-16 lg:py-16">
          <div>
            <p className="text-sm font-medium text-signal">Free. Open source. No sign-up.</p>
            <h1 className="mt-3 font-display text-xl font-bold leading-[1.1] sm:text-2xl lg:text-3xl lg:leading-[1.06]">
              Build an ATS-friendly resume.
            </h1>
            <p className="mt-5 max-w-[48ch] text-md text-ink-2">
              Pick a layout, add your details, and check your resume. Export PDF, DOCX or LaTeX for free.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-center">
              <Link href="/build" className="btn btn-primary">
                Build my resume
              </Link>
              <a href="#templates" className="btn btn-secondary">
                See the templates
              </a>
            </div>
            <p className="mt-6 text-sm text-ink-3">Drafts save in this browser.</p>
          </div>
          <div className="relative mx-auto min-w-0 w-full max-w-[240px] sm:max-w-[440px]">
            <div className="rounded-[6px]" style={{ boxShadow: "var(--shadow-sheet)" }}>
              <Thumbnail resume={sampleResume} template="standard" width={440} />
            </div>
          </div>
        </section>

        {/* Three things it does */}
        <section className="mt-6 grid gap-6 md:grid-cols-3" aria-label="What it does">
          <Bento
            id="ats"
            tint="bg-tint-sage"
            title="Know what to fix."
            body="Check missing details, weak bullets and keywords from a job description."
          >
            <div className="mt-6 flex items-center gap-4">
              <Ring value={92} />
              <div className="text-sm">
                <p className="font-medium">Example ATS score</p>
                <p className="text-ink-2">14 checks passed</p>
              </div>
            </div>
          </Bento>
          <Bento
            tint="bg-tint-sky"
            title="One resume. Every format."
            body="Your preview, PDF, DOCX and LaTeX use the same details."
          >
            <div className="mt-6 flex flex-wrap gap-2">
              {["PDF", "DOCX", ".tex", "Overleaf"].map((t) => (
                <span key={t} className="chip bg-paper/80 text-ink">
                  {t}
                </span>
              ))}
            </div>
          </Bento>
          <Bento
            tint="bg-tint-lavender"
            title="LaTeX, built in."
            body="Edit and compile in your browser, or continue in Overleaf."
          >
            <pre className="mt-6 hidden overflow-hidden rounded-2xl bg-paper/80 p-4 font-mono text-[12px] leading-relaxed text-ink-2 sm:block">
              {`\\vEntry{Senior Engineer}\n  {Feb 2023 -- Present}\n  {Northwind Payments}`}
            </pre>
          </Bento>
        </section>

        {/* Layouts */}
        <section id="templates" className="mt-12 sm:mt-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-xl font-bold">Choose your layout.</h2>
              <p className="mt-1 max-w-[60ch] text-ink-2">
                Four single-column layouts. Tune fonts, spacing and colour in the builder.
              </p>
            </div>
            <Link href="/build" className="link hidden text-sm md:inline">
              Compare them in the builder
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HTML_TEMPLATES.map((t) => (
              <ProductCard key={t.id} name={t.name} description={t.bestFor} href="/build">
                <Thumbnail resume={sampleResume} template={t.id} width={220} />
              </ProductCard>
            ))}
          </div>
        </section>

        {/* LaTeX styles */}
        <section id="latex" className="mt-12 sm:mt-20">
          <div>
            <h2 className="font-display text-xl font-bold">Prefer LaTeX?</h2>
            <p className="mt-1 max-w-[60ch] text-ink-2">
              Four original styles. Compile here or open in Overleaf.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LATEX_STYLES.map((t) => (
              <ProductCard key={t.id} name={t.name} description={t.detail} href="/build" badge={t.atsSafe ? undefined : "Humans only"}>
                <Thumbnail resume={sampleResume} variant={`tex-${t.id}`} width={220} />
              </ProductCard>
            ))}
          </div>
        </section>

        {/* Explainer */}
        <details className="group tile mt-12 px-5 py-5 sm:mt-20 sm:px-8 sm:py-8">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold [&::-webkit-details-marker]:hidden">
            <span>What makes a resume ATS-friendly?</span><DisclosureIcon />
          </summary>
          <p className="mb-5 mt-3 text-sm text-ink-2">Keep the structure simple so tracking systems can read your details.</p>
          <ul className="grid gap-4 text-sm sm:grid-cols-2">
            {RULES.map(([t, d]) => (
              <li key={t} className="rounded-2xl bg-paper/70 p-4">
                <p className="font-medium">{t}</p>
                <p className="mt-1 text-ink-2">{d}</p>
              </li>
            ))}
          </ul>
        </details>

        {/* Why this exists */}
        <section id="why" className="mt-12 grid gap-8 sm:mt-20 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-display text-xl font-bold">Why ResumeFold?</h2>
          </div>
          <div className="max-w-[62ch] space-y-4 text-ink-2">
            <p>
              A free resume builder without accounts or subscriptions. Your words stay yours, and your drafts stay in your browser.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mt-12 grid gap-8 sm:mt-20 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-display text-xl font-bold">Common questions</h2>
          </div>
          <div className="divide-y divide-rule">
            {FAQ.map((f) => (
              <details key={f.q} name="resumefold-faq" className="group py-2">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-2 font-medium [&::-webkit-details-marker]:hidden">
                  <span>{f.q}</span><DisclosureIcon />
                </summary>
                <p className="pb-3 pt-1 text-sm text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="tile mt-12 px-5 py-10 text-center sm:mt-20 sm:px-8 sm:py-14 md:px-16">
          <h2 className="font-display text-xl font-bold md:text-2xl">Ready to start?</h2>
          <p className="mx-auto mt-3 max-w-[44ch] text-ink-2">Use the sample or start with a blank page.</p>
          <Link href="/build" className="btn btn-primary mt-8">
            Build my resume
          </Link>
        </section>
      </main>

      <footer className="mx-auto mt-12 max-w-[1440px] break-words px-4 pb-[max(40px,env(safe-area-inset-bottom))] sm:mt-16 sm:px-6">
        <div className="grid gap-4 border-t border-rule pt-6 text-xs text-ink-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <p>
              &copy; {years} {SITE.owner}. All rights reserved.
              {" "}Source code is available under the {SITE.license} License
              {SITE.repo ? (
                <>
                  {" "}
                  <a className="link" href={SITE.repo} rel="noopener">
                    on GitHub
                  </a>
                </>
              ) : null}
              .
            </p>
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-ink-2 [&::-webkit-details-marker]:hidden">Privacy and project details<DisclosureIcon /></summary>
              <p className="mb-2">
                Drafts stay in this browser. PDF and DOCX exports are built locally. Choosing Overleaf or approving the optional remote
                LaTeX compiler sends your source to that service.
              </p>
              <p>
                Overleaf, Workday, Taleo, iCIMS, Greenhouse and Lever are trademarks of their respective owners. {SITE.name} is an independent
                project and is not affiliated with or endorsed by any of them.
              </p>
            </details>
          </div>
          <nav className="flex min-h-11 flex-wrap items-center gap-x-6 gap-y-1 md:justify-end" aria-label="Footer">
            <a className="inline-flex min-h-11 items-center hover:text-ink" href="#templates">Templates</a>
            <a className="inline-flex min-h-11 items-center hover:text-ink" href="#faq">FAQ</a>
            <Link className="inline-flex min-h-11 items-center hover:text-ink" href="/build">Builder</Link>
            <Link className="inline-flex min-h-11 items-center hover:text-ink" href="/changelog">Changelog</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Bento({ tint, title, body, children, id }: { tint: string; title: string; body: string; children?: React.ReactNode; id?: string }) {
  return (
    <div id={id} className={`min-w-0 rounded-card p-6 sm:p-8 ${tint}`}>
      <h3 className="font-display text-lg font-bold leading-snug">{title}</h3>
      <p className="mt-2 text-sm text-ink-2">{body}</p>
      {children}
    </div>
  );
}

function ProductCard({
  name,
  description,
  href,
  badge,
  children,
}: {
  name: string;
  description: string;
  href: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="group block">
      <div
        className="template-art relative flex justify-center overflow-hidden rounded-card bg-paper-3 px-6 pt-8 transition-transform duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.015]"
        style={{ transitionTimingFunction: "var(--ease-out)" }}
      >
        <div className="max-h-[230px] w-[220px] overflow-hidden rounded-t-[6px]" style={{ boxShadow: "var(--shadow-sheet)" }}>
          {children}
        </div>
        {badge && <span className="chip absolute right-4 top-4 bg-amber-soft text-amber">{badge}</span>}
      </div>
      <div className="px-1 pt-4">
        <h3 className="font-display font-bold">{name}</h3>
        <p className="mt-0.5 text-sm text-ink-2">{description}</p>
        <span className="link mt-3 inline-block text-sm">Use this one</span>
      </div>
    </Link>
  );
}

function DisclosureIcon() {
  return <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 transition-transform group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>;
}

function Ring({ value }: { value: number }) {
  const R = 22;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative grid h-14 w-14 place-items-center">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={R} fill="none" stroke="rgb(0 0 0 / 0.08)" strokeWidth="6" />
        <circle cx="28" cy="28" r={R} fill="none" stroke="var(--moss)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * value) / 100} />
      </svg>
      <span className="absolute font-mono text-sm font-medium">{value}</span>
    </div>
  );
}
