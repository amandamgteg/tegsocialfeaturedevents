import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchFeed } from "@/lib/feed";
import { rawEvent } from "../fixtures/feed";

const respond = (body: unknown, init: { status?: number; text?: string } = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(init.text ?? JSON.stringify(body), { status: init.status ?? 200 }),
    ),
  );

afterEach(() => vi.unstubAllGlobals());

describe("fetchFeed", () => {
  it("maps misha-star to starred and keeps id, title, url, date, tags", async () => {
    respond({ today: "2026-10-11", overlay: {}, cap: {}, events: [rawEvent()] });
    expect(await fetchFeed()).toEqual([
      {
        id: "tinker-tuesday-2026-10-20",
        title: "Tinker Tuesday",
        url: "https://example.com/tinker",
        date: "2026-10-20",
        tags: ["making"],
        starred: true,
        recurring: false,
      },
    ]);
  });
  it("drops featured, overlay and cap", async () => {
    respond({ overlay: { a: 1 }, cap: { b: 2 }, events: [rawEvent()] });
    const [e] = await fetchFeed();
    for (const k of ["featured", "overlay", "cap", "misha-star", "past", "description"]) {
      expect(e).not.toHaveProperty(k);
    }
  });
  it("treats a missing misha-star as starred: false", async () => {
    const raw = rawEvent();
    delete (raw as Record<string, unknown>)["misha-star"];
    respond({ events: [raw] });
    expect((await fetchFeed())[0].starred).toBe(false);
  });
  it("marks an event as recurring when the feed gives a recurrence such as weekly or biweekly", async () => {
    respond({ events: [rawEvent({ recurrence: "weekly" }), rawEvent({ recurrence: "biweekly" }), rawEvent({ recurrence: null })] });
    expect((await fetchFeed()).map((e) => e.recurring)).toEqual([true, true, false]);
  });
  it("does not treat an unrecognised recurrence value as recurring", async () => {
    respond({ events: [rawEvent({ recurrence: "Etienne Brulé Park" })] });
    expect((await fetchFeed())[0].recurring).toBe(false);
  });
  it("treats a missing tags field as an empty list", async () => {
    const raw = rawEvent();
    delete (raw as Record<string, unknown>).tags;
    respond({ events: [raw] });
    expect((await fetchFeed())[0].tags).toEqual([]);
  });
  it("throws a clear error on a non-200 response", async () => {
    respond({}, { status: 503 });
    await expect(fetchFeed()).rejects.toThrow(/feed.*503/i);
  });
  it("throws a clear error on malformed JSON", async () => {
    respond(null, { text: "<html>nope" });
    await expect(fetchFeed()).rejects.toThrow(/feed.*(malformed|parse|invalid)/i);
  });
  it("throws when the body has no events list", async () => {
    respond({ today: "2026-10-11" });
    await expect(fetchFeed()).rejects.toThrow(/feed.*(malformed|events)/i);
  });
  it("throws when an event is missing a required field", async () => {
    respond({ events: [rawEvent({ url: undefined })] });
    await expect(fetchFeed()).rejects.toThrow(/feed.*(malformed|event)/i);
  });
});
