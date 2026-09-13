"use client";

import { nanoid } from "nanoid";
import { BulletsField, MonthField, TextField } from "@/components/ui/Field";
import { AddButton, EntryCard } from "@/components/ui/EntryCard";
import { useActiveResume, useResumeStore } from "@/lib/store";
import { fmtRange } from "@/lib/dates";

export function StepExperience() {
  const r = useActiveResume();
  const update = useResumeStore((s) => s.update);

  const move = (i: number, dir: -1 | 1) =>
    update((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.experience.length) return;
      [d.experience[i], d.experience[j]] = [d.experience[j], d.experience[i]];
    });

  return (
    <div className="grid gap-3">
      {r.experience.map((e, i) => {
        const spot = `experience.${e.id}`;
        const set = <K extends keyof typeof e>(k: K, v: (typeof e)[K]) =>
          update((d) => {
            const x = d.experience.find((y) => y.id === e.id);
            if (x) x[k] = v;
          });
        return (
          <EntryCard
            key={e.id}
            title={e.title || "New role"}
            subtitle={[e.company, fmtRange(e.start, e.end, e.current)].filter(Boolean).join(" · ")}
            defaultOpen={!e.title}
            onRemove={() =>
              update((d) => {
                d.experience = d.experience.filter((y) => y.id !== e.id);
              })
            }
            onMoveUp={i > 0 ? () => move(i, -1) : undefined}
            onMoveDown={i < r.experience.length - 1 ? () => move(i, 1) : undefined}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Job title" value={e.title} onChange={(ev) => set("title", ev.target.value)} spot={spot} placeholder="Senior Software Engineer" />
              <TextField label="Company" value={e.company} onChange={(ev) => set("company", ev.target.value)} spot={spot} placeholder="Northwind Payments" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField label="Location" value={e.location} onChange={(ev) => set("location", ev.target.value)} spot={spot} placeholder="San Francisco, CA" />
              <MonthField label="Start" value={e.start} onChange={(v) => set("start", v)} spot={spot} />
              <div>
                <MonthField label="End" value={e.end} onChange={(v) => set("end", v)} spot={spot} disabled={e.current} />
                <label className="mt-2 flex items-center gap-2 text-xs text-ink-2">
                  <input
                    type="checkbox"
                    checked={e.current}
                    onChange={(ev) => set("current", ev.target.checked)}
                    className="accent-[var(--signal)]"
                  />
                  I work here now
                </label>
              </div>
            </div>
            <BulletsField
              value={e.bullets}
              onChange={(v) => set("bullets", v)}
              spot={spot}
              placeholder={"Led migration of X to Y, cutting p99 latency from 840ms to 120ms\nDesigned…"}
            />
          </EntryCard>
        );
      })}
      <AddButton
        onClick={() =>
          update((d) => {
            d.experience.push({ id: nanoid(8), title: "", company: "", location: "", start: "", end: "", current: false, bullets: [] });
          })
        }
      >
        Add a role
      </AddButton>
    </div>
  );
}
