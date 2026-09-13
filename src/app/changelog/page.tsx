import type { Metadata } from "next";
import Link from "next/link";
import { FloatingNav } from "@/components/ui/FloatingNav";
import { CHANGELOG } from "@/lib/changelog";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Updates to ResumeFold, organised by month and release number.",
  alternates: { canonical: "/changelog/" },
};

const monthFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });
const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function ChangelogPage() {
  return (
    <div className="min-h-dvh">
      <FloatingNav brand={SITE.name} items={[
        { href: "/", label: "Home" },
        { href: "/#templates", label: "Templates" },
        { href: "/changelog/", label: "Changelog" },
      ]} cta={{ href: "/build", label: "Build my resume" }} />
      <main className="mx-auto max-w-3xl px-5 pb-12 pt-[calc(96px+env(safe-area-inset-top))] sm:px-8 lg:pt-28">
        <h1 className="font-display text-xl font-bold sm:text-2xl">Changelog</h1>
        <p className="mt-3 text-sm text-ink-2">What changed, month by month. Updates from the project and its contributors.</p>
        <div className="mt-10 space-y-12">
          {CHANGELOG.map(({ month, entries }) => (
            <section key={month} aria-labelledby={`month-${month}`}>
              <h2 id={`month-${month}`} className="font-display text-lg font-bold sm:text-xl">
                {monthFormat.format(new Date(`${month}-01T00:00:00Z`))}
              </h2>
              <div className="mt-6 space-y-6">
                {entries.map(({ version, date, changes }) => (
                  <article key={version} className="rounded-tile bg-paper-2 p-5 sm:p-6">
                    <h3 className="font-display text-md font-bold">{version}</h3>
                    <time dateTime={date} className="mt-1 block text-xs text-ink-3">
                      {dateFormat.format(new Date(`${date}T00:00:00Z`))}
                    </time>
                    <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-ink-2">
                      {changes.map((change) => <li key={change}>{change}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <footer className="mx-auto max-w-3xl px-5 pb-[max(32px,env(safe-area-inset-bottom))] sm:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm text-ink-2 hover:text-ink">Back to ResumeFold</Link>
      </footer>
    </div>
  );
}
