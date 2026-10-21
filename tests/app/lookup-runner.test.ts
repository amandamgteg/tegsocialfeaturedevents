import { describe, it, expect } from "vitest";
import { runLookups } from "@/app/lookupRunner";
import type { EventCard, ImageResult } from "@/lib/types";

const cards = (n: number): EventCard[] =>
  Array.from({ length: n }, (_, i) => ({ id: `e${i}`, title: `T${i}`, key: `https://example.com/${i}`, url: `https://example.com/${i}`, date: "2026-10-20", dates: ["2026-10-20"], tags: [] }));

const ok = (id: string): ImageResult => ({ status: "resolved", imageUrl: `https://img.example.com/${id}.jpg` });

/** A fake lookup whose calls stay pending until the test settles them. */
function controllable() {
  const pending = new Map<string, (r: ImageResult) => void>();
  let inFlight = 0;
  let maxInFlight = 0;
  const started: string[] = [];
  const find = (card: EventCard) =>
    new Promise<ImageResult>((resolve) => {
      started.push(card.id);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      pending.set(card.id, (r) => {
        inFlight--;
        resolve(r);
      });
    });
  const settle = async (id: string, r: ImageResult = ok(id)) => {
    pending.get(id)!(r);
    await new Promise((r) => setTimeout(r, 0));
  };
  return { find, settle, started, stats: () => ({ inFlight, maxInFlight }) };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("runLookups", () => {
  it("starts 5 at a time, never more", async () => {
    const c = controllable();
    const done = runLookups(cards(12), c.find, () => {});
    await tick();
    expect(c.started).toHaveLength(5);
    for (let i = 0; i < 12; i++) await c.settle(`e${i}`);
    await done;
    expect(c.stats().maxInFlight).toBe(5);
    expect(c.started).toHaveLength(12);
  });
  it("starts the next lookup as soon as one finishes, in card order", async () => {
    const c = controllable();
    const done = runLookups(cards(8), c.find, () => {});
    await tick();
    expect(c.started).toEqual(["e0", "e1", "e2", "e3", "e4"]);
    await c.settle("e2");
    expect(c.started).toEqual(["e0", "e1", "e2", "e3", "e4", "e5"]);
    await c.settle("e0");
    expect(c.started.at(-1)).toBe("e6");
    for (const id of ["e1", "e3", "e4", "e5", "e6", "e7"]) await c.settle(id);
    await done;
  });
  it("reports each result as it arrives, by card id", async () => {
    const c = controllable();
    const got: [string, ImageResult][] = [];
    const done = runLookups(cards(2), c.find, (id, r) => got.push([id, r]));
    await tick();
    await c.settle("e1");
    expect(got).toEqual([["e1", ok("e1")]]);
    await c.settle("e0", { status: "failed", reason: "nope" });
    await done;
    expect(got[1]).toEqual(["e0", { status: "failed", reason: "nope" }]);
  });
  it("turns a lookup that throws into a failed result and keeps going", async () => {
    const got: Record<string, ImageResult> = {};
    await runLookups(
      cards(3),
      async (card) => {
        if (card.id === "e1") throw new Error("network down");
        return ok(card.id);
      },
      (id, r) => (got[id] = r),
    );
    expect(got.e1).toEqual({ status: "failed", reason: "network down" });
    expect(got.e0.status).toBe("resolved");
    expect(got.e2.status).toBe("resolved");
  });
  it("resolves immediately for no cards", async () => {
    await expect(runLookups([], async () => ok("x"), () => {})).resolves.toBeUndefined();
  });
});
