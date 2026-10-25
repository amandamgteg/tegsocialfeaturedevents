// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventsApp } from "@/app/EventsApp";
import { loadEdits, saveEdits } from "@/lib/slideEdits";

const mocks = vi.hoisted(() => ({ renderSlide: vi.fn(), downloadFinished: vi.fn(), measureImage: vi.fn() }));
vi.mock("@/lib/slideDraw", () => ({ renderSlide: mocks.renderSlide }));
vi.mock("@/lib/socialZip", () => ({ downloadFinished: mocks.downloadFinished }));
vi.mock("@/app/slideSupport", () => ({
  measureImage: mocks.measureImage,
  canvasTextMeasurer: () => (text: string, size: number) => text.length * size * 0.5,
}));

const iso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const feed = [{ id: "a-1", title: "Event a", url: "https://events.example.com/a", date: iso(2), tags: ["x"], starred: true }];

beforeEach(() => {
  localStorage.clear();
  mocks.renderSlide.mockReset().mockImplementation(async () => new Blob(["png"], { type: "image/png" }));
  mocks.measureImage.mockReset().mockResolvedValue({ width: 800, height: 800 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (String(input) === "/api/events") return Response.json(feed);
      const body = JSON.parse(String(init?.body));
      return Response.json({ status: "resolved", imageUrl: `https://img.example.com/${body.url.split("/").pop()}.png` });
    }),
  );
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => `blob:test/${++n}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe("EventsApp and saved slide edits", () => {
  it("drops edits for events whose date has passed when the page loads, and keeps the rest", async () => {
    saveEdits("https://events.example.com/old", { topText: "old" }, iso(-1));
    saveEdits("https://events.example.com/soon", { topText: "soon" }, iso(5));
    render(<EventsApp />);
    await screen.findByText(/1 image loaded/);
    expect(loadEdits("https://events.example.com/old")).toEqual({});
    expect(loadEdits("https://events.example.com/soon")).toEqual({ topText: "soon" });
  });

  it("opens the editor with the edits from last time", async () => {
    saveEdits("https://events.example.com/a", { topText: "from last time" }, iso(2));
    render(<EventsApp />);
    await screen.findByText(/1 image loaded/);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Event a" }));
    fireEvent.click(screen.getByRole("button", { name: "Make social images" }));
    await screen.findByAltText("Instagram slide: Event a");
    expect(mocks.renderSlide.mock.calls.at(-1)![0].topBox.lines.join(" ")).toBe("from last time");
  });

  it("Start over also forgets every saved slide edit", async () => {
    saveEdits("https://events.example.com/a", { topText: "from last time" }, iso(2));
    render(<EventsApp />);
    await screen.findByText(/1 image loaded/);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Event a" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(loadEdits("https://events.example.com/a")).toEqual({});
  });
});
