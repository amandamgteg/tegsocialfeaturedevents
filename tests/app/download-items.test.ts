import { describe, it, expect } from "vitest";
import { selectedDownloadItems } from "@/app/selection";
import type { EventCard } from "@/lib/types";
import type { ImageStates } from "@/app/CardList";

const card = (n: number, date = "2026-10-07"): EventCard => ({ id: `id${n}`, title: `Event ${n}`, key: `https://e.com/${n}`, url: `https://e.com/${n}`, date, dates: [date], tags: [] });
const ok = (n: number) => ({ status: "resolved" as const, imageUrl: `https://img.example.com/${n}.jpg` });
const known = (...cards: EventCard[]) => new Map(cards.map((c) => [c.key, c]));

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

describe("cards of a repeating event that share a link", () => {
  const week = (date: string): EventCard => ({ id: `w-${date}`, key: `https://e.com/w#${date}`, title: "Weekly", url: "https://e.com/w", date, dates: [date], tags: [] });
  it("download one item per picked date, all using the one image found for the link", () => {
    const items = selectedDownloadItems(new Set([week("2026-10-28").key, week("2026-11-11").key]), known(week("2026-10-28"), week("2026-11-11")), { "https://e.com/w": ok(1) });
    expect(items.map((i) => i.date)).toEqual(["2026-10-28", "2026-11-11"]);
  });
  it("can be picked one date at a time", () => {
    const items = selectedDownloadItems(new Set([week("2026-11-11").key]), known(week("2026-10-28"), week("2026-11-11")), { "https://e.com/w": ok(1) });
    expect(items.map((i) => i.date)).toEqual(["2026-11-11"]);
  });
});
