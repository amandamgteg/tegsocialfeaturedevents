// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { EventsApp } from "@/app/EventsApp";

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
const feed = [
  { id: "a-1", title: "Event a", url: "https://events.example.com/a", date: iso(3), tags: ["red"], starred: true },
  { id: "b-1", title: "Event b", url: "https://events.example.com/b", date: iso(1), tags: ["blue"], starred: true },
  { id: "c-1", title: "Event c", url: "https://events.example.com/c", date: iso(2), tags: ["blue"], starred: true },
];

beforeEach(() => {
  localStorage.clear();
  mocks.renderSlide.mockReset().mockImplementation(async () => new Blob(["png"], { type: "image/png" }));
  mocks.downloadFinished.mockReset().mockResolvedValue(undefined);
  mocks.measureImage.mockReset().mockResolvedValue({ width: 800, height: 800 });
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => `blob:test/${++n}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (String(input) === "/api/events") return Response.json(feed);
      const card = JSON.parse(String(init?.body));
      return Response.json({ status: "resolved", imageUrl: `https://img.example.com/${card.url.split("/").pop()}.png` });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const pick = (t: string) => fireEvent.click(screen.getByRole("checkbox", { name: `Select ${t}` }));
const wall = () => screen.getByRole("complementary", { name: "Your photo wall" });

describe("Make social images button", () => {
  it("is disabled until an event is picked", async () => {
    render(<EventsApp />);
    await screen.findByText(/3 images loaded/);
    expect(within(wall()).getByRole("button", { name: "Make social images" })).toBeDisabled();
    pick("Event a");
    expect(within(wall()).getByRole("button", { name: "Make social images" })).toBeEnabled();
  });

  it("opens the editor with only the picked events, soonest first", async () => {
    render(<EventsApp />);
    await screen.findByText(/3 images loaded/);
    pick("Event a");
    pick("Event b");
    fireEvent.click(within(wall()).getByRole("button", { name: "Make social images" }));
    const dialog = screen.getByRole("dialog", { name: "Make social images" });
    const previews = await within(dialog).findAllByRole("img");
    expect(previews.map((p) => p.getAttribute("alt"))).toEqual(["Instagram slide: Event b", "Instagram slide: Event a"]);
  });

  it("closes and goes back to the cards, with the picks kept", async () => {
    render(<EventsApp />);
    await screen.findByText(/3 images loaded/);
    pick("Event a");
    fireEvent.click(within(wall()).getByRole("button", { name: "Make social images" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Event a" })).toBeChecked();
  });
});
