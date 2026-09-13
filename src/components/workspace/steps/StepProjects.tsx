"use client";

import { nanoid } from "nanoid";
import { BulletsField, MonthField, TextField } from "@/components/ui/Field";
import { AddButton, EntryCard } from "@/components/ui/EntryCard";
import { useActiveResume, useResumeStore } from "@/lib/store";

export function StepProjects() {
  const r = useActiveResume();
  const update = useResumeStore((s) => s.update);

  const move = (i: number, dir: -1 | 1) =>
    update((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.projects.length) return;
      [d.projects[i], d.projects[j]] = [d.projects[j], d.projects[i]];
    });

  return (
    <div className="grid gap-3">
      {r.projects.map((p, i) => {
        const spot = `projects.${p.id}`;
        const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) =>
          update((d) => {
            const x = d.projects.find((y) => y.id === p.id);
            if (x) x[k] = v;
          });
        return (
          <EntryCard
            key={p.id}
            title={p.name || "New project"}
            subtitle={p.tech}
            defaultOpen={!p.name}
            onRemove={() =>
              update((d) => {
                d.projects = d.projects.filter((y) => y.id !== p.id);
              })
            }
            onMoveUp={i > 0 ? () => move(i, -1) : undefined}
            onMoveDown={i < r.projects.length - 1 ? () => move(i, 1) : undefined}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Name" value={p.name} onChange={(ev) => set("name", ev.target.value)} spot={spot} placeholder="Ledgerlite" />
              <TextField label="Link" value={p.link} onChange={(ev) => set("link", ev.target.value)} spot={spot} placeholder="github.com/you/project" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField label="Tech" value={p.tech} onChange={(ev) => set("tech", ev.target.value)} spot={spot} placeholder="Go, SQLite, WebAssembly" />
              <MonthField label="Start" value={p.start} onChange={(v) => set("start", v)} spot={spot} />
              <MonthField label="End" value={p.end} onChange={(v) => set("end", v)} spot={spot} />
            </div>
            <BulletsField value={p.bullets} onChange={(v) => set("bullets", v)} spot={spot} placeholder="Built X that does Y; used by Z people" />
          </EntryCard>
        );
      })}
      <AddButton
        onClick={() =>
          update((d) => {
            d.projects.push({ id: nanoid(8), name: "", link: "", tech: "", start: "", end: "", bullets: [] });
          })
        }
      >
        Add a project
      </AddButton>
    </div>
  );
}
