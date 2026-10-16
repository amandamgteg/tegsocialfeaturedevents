// Shared look for "Design I" (design/teg-event-picker-design-i.html).
export const MONO = "'Space Mono', monospace";

const ICONS: Record<string, string> = {
  Learning: "M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5v-15z M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3",
  Music: "M9 18V5l11-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  Nightlife: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  Talks: "M4 5h16v11H9l-5 4V5z",
  Community: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M17 11a2.5 2.5 0 1 0 0-5 M18 14a4 4 0 0 1 3 4v2",
  Making: "M15 4a5 5 0 0 0-4.6 6.9L3 18.3 5.7 21l7.4-7.4A5 5 0 0 0 20 9l-3 3-3-1-1-3 3-3a5 5 0 0 0-1-.9z",
  Art: "M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z M8 11h.01 M12 8h.01 M16 11h.01",
  Food: "M6 3v8 M10 3v8 M6 7h4 M8 11v10 M17 3c-2 2-3 5-3 8h3v10",
  // Added for tags in the real feed that the design file has no icon for.
  games: "M6 11h4 M8 9v4 M15 12h.01 M18 10h.01 M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.2 6A3 3 0 0 0 4.5 18c.9 0 1.7-.4 2.2-1.1L8 15h8l1.3 1.9c.5.7 1.3 1.1 2.2 1.1a3 3 0 0 0 2.9-3.8l-1.2-6A4 4 0 0 0 17.3 5z",
  intimacy: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z",
  nerdy: "M6 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M18 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M9.5 14.5h5 M2.5 14.5L5 7 M21.5 14.5L19 7",
  outdoors: "M2 20l7-12 4 7 3-4 6 9z M17 5a1.5 1.5 0 1 0 0 .01",
  talky: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z M15 9a4 4 0 0 1 0 6 M18 6.5a8 8 0 0 1 0 11",
};
const FALLBACK_ICON = "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0"; // a plain dot for any tag the design has no icon for
const STAR = "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z";

const iconFor = (tag: string) => ICONS[Object.keys(ICONS).find((k) => k.toLowerCase() === tag.toLowerCase()) ?? ""] ?? FALLBACK_ICON;

export function TagIcon({ tag, size, stroke, width }: { tag: string; size: number; stroke: string; width: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={iconFor(tag)} />
    </svg>
  );
}

export function Star({ size, style, pop }: { size: number; style: React.CSSProperties; pop?: boolean }) {
  return (
    <svg className={pop ? "star" : undefined} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      <path d={STAR} fill="#f5a93b" stroke="#1a1200" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

/** "2026-10-15" becomes "Thu Oct 15". */
export const dateLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }).replace(",", "");

export function StepBadge({ n, size }: { n: number; size: number }) {
  return (
    <span style={{ width: size, height: size, flex: "none", borderRadius: "50%", background: "#f5a93b", color: "#1a1200", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {n}
    </span>
  );
}
