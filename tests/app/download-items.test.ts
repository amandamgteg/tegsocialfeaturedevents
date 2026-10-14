import { describe, it, expect } from "vitest";
import { selectedDownloadItems } from "@/app/selection";
import type { EventCard } from "@/lib/types";
import type { ImageStates } from "@/app/CardList";

const card = (n: number, date = "2026-10-07"): EventCard => ({ id: `id${n}`, title: `Event ${n}`, url: `https://e.com/${n}`, date, tags: [] });
const ok = (n: number) => ({ status: "resolved" as const, imageUrl: `https://img.example.com/${n}.jpg` });
const known = (...cards: EventCard[]) => new Map(cards.map((c) => [c.url, c]));

describe("selectedDownloadItems", () => {
  it("turns each selected event with an image into date, title and image address", () => {
    const items = selectedDownloadItems(new Set(["https://e.com/1"]), known(card(1)), { "https://e.com/1": ok(1) });
    expect(items).toEqual([{ date: "2026-10-07", title: "Event 1", imageUrl: "https://img.example.com/1.jpg" }]);
  });
  it("includes selected events that are hidden, because it only looks at the selection (decision 9)", () => {
    const images: Record<string, ImageStates[string]> = { "https://e.com/1": ok(1), "https://e.com/2": ok(2), "https://e.com/3": ok(3) };
    const items = selectedDownloadItems(new Set(Object.keys(images)), known(card(1), card(2), card(3)), images);
    expect(items).toHaveLength(3);
  });
  it("leaves out anything not selected", () => {
    const images = { "https://e.com/1": ok(1), "https://e.com/2": ok(2) };
    expect(selectedDownloadItems(new Set(["https://e.com/2"]), known(card(1), card(2)), images).map((i) => i.title)).toEqual(["Event 2"]);
  });
  it("leaves out a selected event with no resolved image, or one it knows nothing about", () => {
    const images: Record<string, ImageStates[string]> = { "https://e.com/1": "loading", "https://e.com/2": { status: "failed", reason: "x" } };
    const sel = new Set(["https://e.com/1", "https://e.com/2", "https://e.com/3"]);
    expect(selectedDownloadItems(sel, known(card(1), card(2), card(3)), images)).toEqual([]);
    expect(selectedDownloadItems(new Set(["https://e.com/9"]), known(), { "https://e.com/9": ok(9) })).toEqual([]);
  });
  it("sorts by date, then title, so the ZIP is in a sensible order", () => {
    const images = { "https://e.com/1": ok(1), "https://e.com/2": ok(2), "https://e.com/3": ok(3) };
    const items = selectedDownloadItems(new Set(Object.keys(images)), known(card(1, "2026-10-09"), card(2, "2026-10-07"), card(3, "2026-10-07")), images);
    expect(items.map((i) => i.title)).toEqual(["Event 2", "Event 3", "Event 1"]);
  });
});
