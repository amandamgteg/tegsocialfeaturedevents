import type { ImageStates } from "./CardList";
import type { DownloadItem } from "@/lib/download";
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

/**
 * What to download: every selected event that has a found image, wherever it is on screen.
 * Looks only at the selection, so events hidden by a filter or the date window are included (decision 9).
 */
export function selectedDownloadItems(
  selected: ReadonlySet<string>,
  cardsByUrl: ReadonlyMap<string, EventCard>,
  images: ImageStates,
): DownloadItem[] {
  return [...selected]
    .flatMap((url) => {
      const card = cardsByUrl.get(url);
      const state = images[url];
      if (!card || !state || state === "loading" || state.status !== "resolved") return [];
      return [{ date: card.date, title: card.title, imageUrl: state.imageUrl }];
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}
