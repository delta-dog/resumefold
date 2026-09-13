"use client";

import { nanoid } from "nanoid";
import { BulletsField, MonthField, TextField } from "@/components/ui/Field";
import { AddButton, EntryCard } from "@/components/ui/EntryCard";
import { useActiveResume, useResumeStore } from "@/lib/store";
import { fmtRange } from "@/lib/dates";

export function StepEducation() {
  const r = useActiveResume();
  const update = useResumeStore((s) => s.update);

  const move = (i: number, dir: -1 | 1) =>
    update((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.education.length) return;
      [d.education[i], d.education[j]] = [d.education[j], d.education[i]];
    });

  return (
    <div className="grid gap-3">
      {r.education.map((e, i) => {
        const spot = `education.${e.id}`;
        const set = <K extends keyof typeof e>(k: K, v: (typeof e)[K]) =>
          update((d) => {
            const x = d.education.find((y) => y.id === e.id);
            if (x) x[k] = v;
          });
        return (
          <EntryCard
            key={e.id}
            title={e.school || "New school"}
            subtitle={[[e.degree, e.field].filter(Boolean).join(" in "), fmtRange(e.start, e.end)].filter(Boolean).join(" · ")}
            defaultOpen={!e.school}
            onRemove={() =>
              update((d) => {
                d.education = d.education.filter((y) => y.id !== e.id);
              })
            }
            onMoveUp={i > 0 ? () => move(i, -1) : undefined}
            onMoveDown={i < r.education.length - 1 ? () => move(i, 1) : undefined}
          >
            <TextField label="School" value={e.school} onChange={(ev) => set("school", ev.target.value)} spot={spot} placeholder="University of Washington" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField label="Degree" value={e.degree} onChange={(ev) => set("degree", ev.target.value)} spot={spot} placeholder="B.S." />
              <TextField label="Field" value={e.field} onChange={(ev) => set("field", ev.target.value)} spot={spot} placeholder="Computer Science" />
              <TextField label="GPA" value={e.gpa} onChange={(ev) => set("gpa", ev.target.value)} spot={spot} placeholder="3.8/4.0" hint="Leave blank under 3.5." />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField label="Location" value={e.location} onChange={(ev) => set("location", ev.target.value)} spot={spot} placeholder="Seattle, WA" />
              <MonthField label="Start" value={e.start} onChange={(v) => set("start", v)} spot={spot} />
              <MonthField label="End (or expected)" value={e.end} onChange={(v) => set("end", v)} spot={spot} />
            </div>
            <BulletsField
              label="Details"
              value={e.details}
              onChange={(v) => set("details", v)}
              spot={spot}
              placeholder="Dean's List; relevant coursework; thesis title"
              hint="Optional. One line each."
            />
          </EntryCard>
        );
      })}
      <AddButton
        onClick={() =>
          update((d) => {
            d.education.push({ id: nanoid(8), school: "", degree: "", field: "", location: "", start: "", end: "", gpa: "", details: [] });
          })
        }
      >
        Add a school
      </AddButton>
    </div>
  );
}
