import { describe, it, expect } from "vitest";
import { clampWindow, tagOptions, filterByTags } from "@/lib/window";
import type { EventCard } from "@/lib/types";

const TODAY = new Date(2026, 9, 14); // max end is 2026-11-13 (+30)
const card = (id: string, tags: string[]): EventCard => ({ id, title: id, url: `https://e.com/${id}`, date: "2026-10-20", tags });

describe("clampWindow", () => {
  it("returns a valid window unchanged", () => {
    const w = { start: "2026-10-14", end: "2026-10-28" };
    expect(clampWindow(w, TODAY)).toEqual(w);
  });
  it("accepts an end exactly at today+30", () => {
    const w = { start: "2026-10-14", end: "2026-11-13" };
    expect(clampWindow(w, TODAY)).toEqual(w);
  });
  it("pulls an end past today+30 back to today+30", () => {
    expect(clampWindow({ start: "2026-10-14", end: "2026-11-14" }, TODAY)).toEqual({ start: "2026-10-14", end: "2026-11-13" });
    expect(clampWindow({ start: "2026-10-14", end: "2027-03-01" }, TODAY).end).toBe("2026-11-13");
  });
  it("corrects an end before the start by making it the start", () => {
    expect(clampWindow({ start: "2026-10-20", end: "2026-10-15" }, TODAY)).toEqual({ start: "2026-10-20", end: "2026-10-20" });
  });
  it("lets the start be before today (only the end is limited)", () => {
    const w = { start: "2026-10-01", end: "2026-10-10" };
    expect(clampWindow(w, TODAY)).toEqual(w);
  });
  it("pulls a start past today+30 back too, so the window is never empty by accident", () => {
    expect(clampWindow({ start: "2026-12-01", end: "2026-12-05" }, TODAY)).toEqual({ start: "2026-11-13", end: "2026-11-13" });
  });
  it("crosses a year boundary when working out today+30", () => {
    const today = new Date(2026, 11, 20); // +30 = 2027-01-19
    expect(clampWindow({ start: "2026-12-20", end: "2027-02-01" }, today).end).toBe("2027-01-19");
  });
});

describe("tagOptions", () => {
  it("returns the distinct tags across the cards, sorted", () => {
    expect(tagOptions([card("a", ["nerdy", "games"]), card("b", ["games", "art"])])).toEqual(["art", "games", "nerdy"]);
  });
  it("returns [] when there are no cards", () => {
    expect(tagOptions([])).toEqual([]);
  });
  it("returns [] when cards have no tags", () => {
    expect(tagOptions([card("a", [])])).toEqual([]);
  });
});

describe("filterByTags", () => {
  const cards = [card("a", ["games"]), card("b", ["music", "games"]), card("c", ["music"]), card("d", [])];
  it("returns all cards when no tags are selected", () => {
    expect(filterByTags(cards, [])).toEqual(cards);
  });
  it("returns the cards with one tag", () => {
    expect(filterByTags(cards, ["games"]).map((c) => c.id)).toEqual(["a", "b"]);
  });
  it("returns the cards with ANY of several tags, once each, in the original order (decision 2)", () => {
    expect(filterByTags(cards, ["music", "games"]).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
  it("returns [] when no card has the tag", () => {
    expect(filterByTags(cards, ["nope"])).toEqual([]);
  });
});
