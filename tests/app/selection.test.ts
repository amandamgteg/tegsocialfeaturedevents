import { describe, it, expect } from "vitest";
import { toggleSelected, hiddenSelectedCount, selectionLabel } from "@/app/selection";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({ id: `id${i}`, title: `T${i}`, url: `https://e.com/${i}`, date: "2026-10-20", tags: [] });

describe("toggleSelected", () => {
  it("adds and removes by event url", () => {
    const one = toggleSelected(new Set(), "https://e.com/1");
    expect([...one]).toEqual(["https://e.com/1"]);
    expect(toggleSelected(one, "https://e.com/1").size).toBe(0);
  });
  it("does not change the set it was given", () => {
    const before = new Set(["a"]);
    toggleSelected(before, "b");
    expect([...before]).toEqual(["a"]);
  });
  it("has no upper limit (decision 8)", () => {
    let s = new Set<string>();
    for (let i = 0; i < 500; i++) s = toggleSelected(s, `https://e.com/${i}`);
    expect(s.size).toBe(500);
  });
});

describe("hiddenSelectedCount", () => {
  it("counts selected events that are not among the visible cards", () => {
    const selected = new Set(["https://e.com/1", "https://e.com/2", "https://e.com/3"]);
    expect(hiddenSelectedCount(selected, [card(1), card(2)])).toBe(1);
  });
  it("is 0 when every selected event is visible, or nothing is selected", () => {
    expect(hiddenSelectedCount(new Set(["https://e.com/1"]), [card(1)])).toBe(0);
    expect(hiddenSelectedCount(new Set(), [card(1)])).toBe(0);
  });
  it("counts selected events that fell out of the date window entirely", () => {
    expect(hiddenSelectedCount(new Set(["https://e.com/99"]), [])).toBe(1);
  });
  it("matches by url, not card id", () => {
    const visible = [{ ...card(1), id: "a-different-id" }];
    expect(hiddenSelectedCount(new Set(["https://e.com/1"]), visible)).toBe(0);
  });
});

describe("selectionLabel", () => {
  it("shows no hidden clause when 0 are hidden", () => {
    expect(selectionLabel(5, 0)).toBe("5 selected");
    expect(selectionLabel(0, 0)).toBe("0 selected");
  });
  it("reports how many are hidden by filters", () => {
    expect(selectionLabel(5, 2)).toBe("5 selected (2 hidden by filters)");
    expect(selectionLabel(3, 1)).toBe("3 selected (1 hidden by filters)");
  });
});
