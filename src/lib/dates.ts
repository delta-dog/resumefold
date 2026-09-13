const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2024-03" → "Mar 2024". Empty stays empty. */
export function fmtMonth(ym: string, long = false): string {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  const name = (long ? MONTHS_LONG : MONTHS)[idx];
  return name ? `${name} ${y}` : y;
}

/** Consistent range formatting — one format everywhere is an ATS rule (B1). */
export function fmtRange(start: string, end: string, current = false, dash = "–"): string {
  const s = fmtMonth(start);
  const e = current ? "Present" : fmtMonth(end);
  if (s && e) return `${s} ${dash} ${e}`;
  return s || e;
}

export function todayYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
