// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventsApp } from "@/app/EventsApp";
import { PICKS_KEY } from "@/app/picks";
import { captureDownloads, readZip, bytes, type Saved } from "../helpers/download";

const iso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ev = (key: string, offset: number) => ({ id: `${key}-1`, title: `Event ${key}`, url: `https://events.example.com/${key}`, date: iso(offset), tags: ["x"], starred: true });
let feed: ReturnType<typeof ev>[];
let calls: { find: string[]; check: string[] };

function stub(failing: string[] = ["c"]) {
  calls = { find: [], check: [] };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/events") return Response.json(feed);
      if (path.startsWith("/api/image?url=")) return new Response(bytes(path.length), { status: 200, headers: { "content-type": "image/png" } });
      const body = JSON.parse(String(init?.body));
      if (path === "/api/check-image") {
        calls.check.push(body.url);
        return Response.json(body.url.endsWith(".jpg") ? { ok: true, imageUrl: body.url } : { ok: false, reason: "That link isn't an image." });
      }
      calls.find.push(body.url);
      const key = body.url.split("/").pop();
      return Response.json(failing.includes(key) ? { status: "failed", reason: "nothing" } : { status: "resolved", imageUrl: `https://img.example.com/${key}.png` });
    }),
  );
}
const box = (t: string) => screen.getByRole("checkbox", { name: `Select ${t}` });
const paste = (title: string, value: string) => {
  fireEvent.change(screen.getByLabelText(`Paste an image link for ${title}`), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: `Use this image for ${title}` }));
};
const open = async (text: RegExp | string) => {
  const view = render(<EventsApp />);
  await screen.findByText(text);
  return view;
};
const picks = () => JSON.parse(localStorage.getItem(PICKS_KEY) ?? '{"selected":[],"pasted":{}}'); // no entry means nothing is remembered

let saved: Saved[];
beforeEach(() => {
  localStorage.clear();
  feed = [ev("a", 1), ev("b", 2), ev("c", 3), ev("far", 20)]; // 'far' is outside the default window; 'c' finds no image
  saved = captureDownloads();
  stub();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("EventsApp: picks survive a refresh", () => {
  it("keeps the same cards selected after a refresh", async () => {
    const first = await open("3 events found · 2 images loaded");
    fireEvent.click(box("Event a"));
    fireEvent.click(box("Event b"));
    first.unmount();
    await open("3 events found · 2 images loaded");
    expect(box("Event a")).toBeChecked();
    expect(box("Event b")).toBeChecked();
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });
  it("saves the picks under the event url, not the card id", async () => {
    await open("3 events found · 2 images loaded");
    fireEvent.click(box("Event a"));
    await waitFor(() => expect(picks()?.selected).toEqual(["https://events.example.com/a"]));
  });
  it("keeps a pasted image after a refresh: resolved, counted and selectable, with no new check", async () => {
    const first = await open("3 events found · 2 images loaded");
    paste("Event c", "https://img.example.com/mine.jpg");
    await screen.findByText("3 events found · 3 images loaded");
    first.unmount();
    calls.check.length = 0;
    await open("3 events found · 3 images loaded");
    expect(calls.check).toEqual([]);
    expect(document.querySelector(`img[src="/api/image?url=${encodeURIComponent("https://img.example.com/mine.jpg")}"]`)).not.toBeNull();
    fireEvent.click(box("Event c"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });
  it("does not look up an event again when it has a pasted image", async () => {
    const first = await open("3 events found · 2 images loaded");
    paste("Event c", "https://img.example.com/mine.jpg");
    await screen.findByText("3 events found · 3 images loaded");
    first.unmount();
    calls.find.length = 0;
    await open("3 events found · 3 images loaded");
    expect(calls.find).not.toContain("https://events.example.com/c");
  });
  it("keeps a pick outside the current window across a refresh, and still downloads it", async () => {
    const first = await open("3 events found · 2 images loaded");
    fireEvent.change(screen.getByLabelText("To"), { target: { value: iso(30) } });
    await screen.findByText("4 events found · 3 images loaded");
    fireEvent.click(box("Event far"));
    first.unmount();
    await open("3 events found · 2 images loaded"); // back to the default window: 'far' is out of sight
    expect(screen.getByText("1 selected (1 hidden by filters)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download selected images" }));
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe(`${iso(20)}_event-far.png`);
  });
  it("drops picks and pasted images for events that have left the feed", async () => {
    localStorage.setItem(
      PICKS_KEY,
      JSON.stringify({ selected: ["https://events.example.com/gone", "https://events.example.com/a"], pasted: { "https://events.example.com/gone": "https://img.example.com/x.jpg" } }),
    );
    await open("3 events found · 2 images loaded");
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    await waitFor(() => expect(picks()).toEqual({ selected: ["https://events.example.com/a"], pasted: {} }));
  });
  it("drops a saved pick outside the window that has no image on hand, since it couldn't be downloaded", async () => {
    localStorage.setItem(PICKS_KEY, JSON.stringify({ selected: ["https://events.example.com/far"], pasted: {} }));
    await open("3 events found · 2 images loaded");
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });
  it("drops a restored pick whose image can no longer be found", async () => {
    localStorage.setItem(PICKS_KEY, JSON.stringify({ selected: ["https://events.example.com/c"], pasted: {} }));
    await open("3 events found · 2 images loaded"); // 'c' is in the window but its lookup fails
    await waitFor(() => expect(screen.getByText("0 selected")).toBeInTheDocument());
  });
  it("removes a pasted image from the saved picks if the browser can't show it", async () => {
    await open("3 events found · 2 images loaded");
    paste("Event c", "https://img.example.com/mine.jpg");
    await screen.findByText("3 events found · 3 images loaded");
    const img = document.querySelector(`img[src="/api/image?url=${encodeURIComponent("https://img.example.com/mine.jpg")}"]`)!;
    fireEvent.error(img);
    await waitFor(() => expect(picks()?.pasted).toEqual({}));
  });
});

describe("EventsApp: Start over", () => {
  it("clears the selection and the pasted images", async () => {
    await open("3 events found · 2 images loaded");
    paste("Event c", "https://img.example.com/mine.jpg");
    await screen.findByText("3 events found · 3 images loaded");
    fireEvent.click(box("Event a"));
    fireEvent.click(box("Event c"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(screen.getByText("3 events found · 2 images loaded")).toBeInTheDocument(); // Event c is back to having no image
    expect(screen.getByLabelText("Paste an image link for Event c")).toBeInTheDocument();
    expect(picks()).toEqual({ selected: [], pasted: {} });
  });
  it("does not touch the cache of found images, so a refresh still shows them straight away", async () => {
    const first = await open("3 events found · 2 images loaded");
    const cacheKeys = () => Object.keys(localStorage).filter((k) => k.startsWith("teg:image:")).sort();
    const before = cacheKeys();
    expect(before.length).toBe(2);
    fireEvent.click(box("Event a"));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(cacheKeys()).toEqual(before);
    first.unmount();
    calls.find.length = 0;
    await open("3 events found · 2 images loaded");
    expect(calls.find).toEqual(["https://events.example.com/c"]); // only the card that never had an image
  });
  it("stays cleared after a refresh", async () => {
    const first = await open("3 events found · 2 images loaded");
    fireEvent.click(box("Event a"));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    first.unmount();
    await open("3 events found · 2 images loaded");
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });
  it("is disabled when there is nothing to clear", async () => {
    await open("3 events found · 2 images loaded");
    expect(screen.getByRole("button", { name: "Start over" })).toBeDisabled();
    fireEvent.click(box("Event a"));
    expect(screen.getByRole("button", { name: "Start over" })).toBeEnabled();
  });
  it("leaves the date range and tag filters alone", async () => {
    await open("3 events found · 2 images loaded");
    fireEvent.click(screen.getByRole("button", { name: "x" }));
    fireEvent.click(box("Event a"));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("button", { name: "x" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("EventsApp: broken browser storage", () => {
  it("loads normally with nothing selected when the saved picks are corrupt", async () => {
    localStorage.setItem(PICKS_KEY, "{{{ not json");
    await open("3 events found · 2 images loaded");
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    fireEvent.click(box("Event a"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });
  it("works, without remembering, when browser storage is blocked", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    await open("3 events found · 2 images loaded");
    fireEvent.click(box("Event a"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });
});
