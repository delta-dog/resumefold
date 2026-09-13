"use client";

import { nanoid } from "nanoid";
import { MonthField, TextField } from "@/components/ui/Field";
import { AddButton, EntryCard } from "@/components/ui/EntryCard";
import { useActiveResume, useResumeStore } from "@/lib/store";
import { fmtMonth } from "@/lib/dates";
import { SECTION_HEADINGS, type SectionId } from "@/lib/schema";
import { orderedSections } from "@/lib/schema";

export function StepExtras() {
  const r = useActiveResume();
  const update = useResumeStore((s) => s.update);

  const order = orderedSections(r);
  const moveSection = (i: number, dir: -1 | 1) =>
    update((d) => {
      const o = orderedSections(d);
      const j = i + dir;
      if (j < 0 || j >= o.length) return;
      [o[i], o[j]] = [o[j], o[i]];
      d.meta.sectionOrder = o;
    });

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h3 className="font-display text-md font-bold">Certifications</h3>
        {r.certifications.map((c) => {
          const spot = `certifications.${c.id}`;
          const set = <K extends keyof typeof c>(k: K, v: (typeof c)[K]) =>
            update((d) => {
              const x = d.certifications.find((y) => y.id === c.id);
              if (x) x[k] = v;
            });
          return (
            <EntryCard
              key={c.id}
              title={c.name || "New certification"}
              subtitle={[c.issuer, fmtMonth(c.date)].filter(Boolean).join(" · ")}
              defaultOpen={!c.name}
              onRemove={() =>
                update((d) => {
                  d.certifications = d.certifications.filter((y) => y.id !== c.id);
                })
              }
            >
              <TextField label="Name" value={c.name} onChange={(ev) => set("name", ev.target.value)} spot={spot} placeholder="AWS Certified Solutions Architect – Associate" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextField label="Issuer" value={c.issuer} onChange={(ev) => set("issuer", ev.target.value)} spot={spot} placeholder="Amazon Web Services" className="sm:col-span-2" />
                <MonthField label="Date" value={c.date} onChange={(v) => set("date", v)} spot={spot} />
              </div>
            </EntryCard>
          );
        })}
        <AddButton
          onClick={() =>
            update((d) => {
              d.certifications.push({ id: nanoid(8), name: "", issuer: "", date: "", link: "" });
            })
          }
        >
          Add a certification
        </AddButton>
      </section>

      <section className="grid gap-3">
        <div>
          <h3 className="font-display text-md font-bold">Section order</h3>
          <p className="mt-1 text-sm text-ink-2">
            Your layout set a sensible default. Empty sections are skipped automatically.
          </p>
        </div>
        <ol className="card divide-y divide-paper">
          {order.map((s, i) => (
            <li key={s} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="font-mono text-[11px] text-ink-3">{i + 1}</span>
              <span className="flex-1 font-medium">{SECTION_HEADINGS[s as SectionId]}</span>
              <button type="button" className="btn btn-ghost btn-icon" disabled={i === 0} onClick={() => moveSection(i, -1)} aria-label="Move up">
                ↑
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                disabled={i === order.length - 1}
                onClick={() => moveSection(i, 1)}
                aria-label="Move down"
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3">
        <h3 className="font-display text-md font-bold">Paper size</h3>
        <div className="flex gap-2">
          {(["letter", "a4"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() =>
                update((d) => {
                  d.meta.paper = p;
                })
              }
              className={`btn ${r.meta.paper === p ? "btn-primary" : "btn-secondary"}`}
            >
              {p === "letter" ? "US Letter" : "A4"}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
