"use client";

import { TextField, TextArea } from "@/components/ui/Field";
import { useActiveResume, useResumeStore } from "@/lib/store";

export function StepBasics() {
  const r = useActiveResume();
  const update = useResumeStore((s) => s.update);
  const c = r.contact;
  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement>) =>
    update((d) => {
      d.contact[k] = e.target.value;
    });

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Full name" value={c.fullName} onChange={set("fullName")} spot="contact.fullName" placeholder="John Doe" autoComplete="name" />
        <TextField label="Headline" value={c.headline} onChange={set("headline")} spot="contact.headline" placeholder="Software Engineer" hint="Optional. A job title, not a slogan." />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Email" type="email" value={c.email} onChange={set("email")} spot="contact" placeholder="you@example.com" autoComplete="email" />
        <TextField label="Phone" type="tel" value={c.phone} onChange={set("phone")} spot="contact" placeholder="(415) 555-0142" autoComplete="tel" />
      </div>
      <TextField label="Location" value={c.location} onChange={set("location")} spot="contact" placeholder="San Francisco, CA" hint="City and state, or city and country. Nobody needs your street." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField label="Website" value={c.website} onChange={set("website")} spot="contact" placeholder="yourname.dev" />
        <TextField label="LinkedIn" value={c.linkedin} onChange={set("linkedin")} spot="contact" placeholder="linkedin.com/in/…" />
        <TextField label="GitHub" value={c.github} onChange={set("github")} spot="contact" placeholder="github.com/…" />
      </div>
      <TextArea
        label="Summary"
        value={r.summary}
        onChange={(e) =>
          update((d) => {
            d.summary = e.target.value;
          })
        }
        spot="summary"
        rows={3}
        placeholder="Two sentences. What you do, the scale you've done it at, what you're after."
        hint="Optional. Students can skip it. Recruiters usually do too."
      />
    </div>
  );
}
