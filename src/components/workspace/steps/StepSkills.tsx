"use client";

import { nanoid } from "nanoid";
import { useState } from "react";
import { TextField } from "@/components/ui/Field";
import { AddButton } from "@/components/ui/EntryCard";
import { useActiveResume, useResumeStore } from "@/lib/store";
import { useFocusStore } from "@/lib/focus";

const SUGGESTED = ["Languages", "Frameworks", "Infrastructure", "Tools", "Databases", "Certifications"];

export function StepSkills() {
  const r = useActiveResume();
  const update = useResumeStore((s) => s.update);

  return (
    <div className="grid gap-3">
      {r.skills.map((g) => (
        <SkillGroup key={g.id} id={g.id} />
      ))}
      <AddButton
        onClick={() =>
          update((d) => {
            const used = new Set(d.skills.map((g) => g.category));
            const category = SUGGESTED.find((s) => !used.has(s)) ?? "";
            d.skills.push({ id: nanoid(8), category, items: [] });
          })
        }
      >
        Add a group
      </AddButton>
      <p className="text-xs text-ink-3">
        Each group becomes one line, like <span className="font-semibold text-ink-2">Languages:</span> Go, TypeScript. That is
        the one form every parser reads correctly.
      </p>
    </div>
  );
}

function SkillGroup({ id }: { id: string }) {
  const g = useActiveResume().skills.find((x) => x.id === id)!;
  const update = useResumeStore((s) => s.update);
  const setFocus = useFocusStore((s) => s.set);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const items = draft
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    update((d) => {
      const x = d.skills.find((y) => y.id === id);
      if (!x) return;
      for (const it of items) if (!x.items.includes(it)) x.items.push(it);
    });
    setDraft("");
  };

  return (
    <div className="card grid gap-3 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField
          label="Group"
          value={g.category}
          onChange={(e) =>
            update((d) => {
              const x = d.skills.find((y) => y.id === id);
              if (x) x.category = e.target.value;
            })
          }
          spot="skills"
          placeholder="Languages"
          className="flex-1"
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm hover:text-signal"
          onClick={() =>
            update((d) => {
              d.skills = d.skills.filter((y) => y.id !== id);
            })
          }
        >
          Remove group
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {g.items.map((it, i) => (
          <span
            key={it + i}
            className="fade-in inline-flex max-w-full items-center gap-1 break-words rounded-pill bg-paper-3 py-1 pl-3 pr-1.5 text-sm text-ink"
          >
            {it}
            <button
              type="button"
              aria-label={`Remove ${it}`}
              className="grid h-5 w-5 place-items-center rounded-full text-ink-3 hover:bg-danger-soft hover:text-danger"
              onClick={() =>
                update((d) => {
                  const x = d.skills.find((y) => y.id === id);
                  if (x) x.items.splice(i, 1);
                })
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="field"
        value={draft}
        placeholder="Type a skill and press Enter, or paste a comma-separated list"
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocus("skills")}
        onBlur={() => {
          setFocus(null);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && draft === "" && g.items.length) {
            update((d) => {
              const x = d.skills.find((y) => y.id === id);
              if (x) x.items.pop();
            });
          }
        }}
      />
    </div>
  );
}
