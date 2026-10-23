// Amanda's month names (SPEC decision 33).
const MONTHS = ["Jan", "Feb", "March", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

type Day = { month: number; day: number; time: number };

function parse(iso: string): Day {
  const [y, m, d] = iso.split("-").map(Number);
  return { month: m - 1, day: d, time: Date.UTC(y, m - 1, d) };
}

const full = (d: Day) => `${MONTHS[d.month]} ${d.day}`;

/**
 * "Oct 21". Consecutive days read "July 1-3" (or "June 30-July 2" across a month change).
 * Anything else reads as a list: "July 1, 4, 6" ("June 30, July 2" across a month change).
 */
export function formatDateLabel(dates: string[]): string {
  const days = [...new Set(dates)].sort().map(parse);
  if (days.length === 0) return "";
  if (days.length === 1) return full(days[0]);
  const consecutive = days.every((d, i) => i === 0 || d.time - days[i - 1].time === DAY_MS);
  if (consecutive) {
    const first = days[0];
    const last = days[days.length - 1];
    return first.month === last.month ? `${full(first)}-${last.day}` : `${full(first)}-${full(last)}`;
  }
  return days.map((d, i) => (i > 0 && days[i - 1].month === d.month ? String(d.day) : full(d))).join(", ");
}
