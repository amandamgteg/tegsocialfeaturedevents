import type { EventCard } from "@/lib/types";

/** Selection is keyed by event URL, not card id: the id depends on the date window (SPEC decisions 7 to 9). */
export function toggleSelected(selected: ReadonlySet<string>, url: string): Set<string> {
  const next = new Set(selected);
  if (!next.delete(url)) next.add(url);
  return next;
}

/** Selected events that are not on screen: hidden by a tag filter or by the date window. */
export function hiddenSelectedCount(selected: ReadonlySet<string>, visible: EventCard[]): number {
  const shown = new Set(visible.map((c) => c.url));
  return [...selected].filter((url) => !shown.has(url)).length;
}

export function selectionLabel(selected: number, hidden: number): string {
  return hidden > 0 ? `${selected} selected (${hidden} hidden by filters)` : `${selected} selected`;
}
