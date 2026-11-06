// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { SocialEditor } from "@/app/SocialEditor";
import type { SlideLayout } from "@/lib/slideLayout";
import type { EventCard } from "@/lib/types";

const mocks = vi.hoisted(() => ({ renderSlide: vi.fn(), downloadFinished: vi.fn(), measureImage: vi.fn() }));
vi.mock("@/lib/slideDraw", () => ({ renderSlide: mocks.renderSlide }));
vi.mock("@/lib/socialZip", () => ({ downloadFinished: mocks.downloadFinished }));
vi.mock("@/app/slideSupport", () => ({
  measureImage: mocks.measureImage,
  canvasTextMeasurer: () => (text: string, size: number) => text.length * size * 0.5,
}));

const A = "https://img.example.com/a.png";
const B = "https://img.example.com/b.png";
const card = (id: string, title: string, date: string): EventCard => ({ id, key: `https://events.example.com/${id}`, title, url: `https://events.example.com/${id}`, date, dates: [date], tags: [] });
const items = [
  { card: card("a", "Event a", "2026-10-07"), imageUrl: A },
  { card: card("b", "Event b", "2026-11-07"), imageUrl: B },
];
const props = { items, onClose: vi.fn(), onDownloadOriginals: vi.fn(), downloadingOriginals: false };

const layouts = (url: string): SlideLayout[] => mocks.renderSlide.mock.calls.map((c) => c[0]).filter((l: SlideLayout) => l.image.url === url);
const latest = (url: string) => layouts(url).at(-1)!;
const gaps = (l: SlideLayout) => [l.image.y - (l.topBox.y + l.topBox.h), l.caption.y - (l.image.y + l.image.h)];

async function openPanel(title = "Event a") {
  await screen.findByAltText(`Instagram slide: ${title}`);
  fireEvent.click(screen.getByRole("button", { name: `Edit slide: ${title}` }));
  const panel = screen.getByRole("dialog", { name: `Edit slide: ${title}` });
  const stage = within(panel).getByTestId("slide-stage");
  // The stage is shown at 360 wide, so each screen pixel is 3 slide pixels.
  vi.spyOn(stage, "getBoundingClientRect").mockReturnValue({ width: 360, height: 640, left: 0, top: 0, right: 360, bottom: 640, x: 0, y: 0, toJSON() {} });
  return panel;
}
const drag = (el: Element, dx: number, dy: number) => {
  fireEvent.mouseDown(el, { clientX: 100, clientY: 100 });
  fireEvent.mouseMove(window, { clientX: 100 + dx, clientY: 100 + dy });
  fireEvent.mouseUp(window, { clientX: 100 + dx, clientY: 100 + dy });
};
const type = (panel: HTMLElement, label: string, value: string) => fireEvent.change(within(panel).getByLabelText(label), { target: { value } });

beforeEach(() => {
  mocks.renderSlide.mockReset().mockImplementation(async () => new Blob(["png"], { type: "image/png" }));
  mocks.downloadFinished.mockReset().mockResolvedValue(undefined);
  mocks.measureImage.mockReset().mockResolvedValue({ width: 800, height: 800 });
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => `blob:test/${++n}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => vi.clearAllMocks());

describe("Image shape control", () => {
  it("lets her pick a ratio for the event image on an Instagram slide, and go back to Original", async () => {
    mocks.measureImage.mockResolvedValue({ width: 1600, height: 800 });
    render(<SocialEditor {...props} />);
    const panel = await openPanel();
    const shape = within(panel).getByLabelText("Image shape") as HTMLSelectElement;
    expect(Array.from(shape.options).map((o) => o.text)).toEqual(["Original", "1:1", "4:5", "16:9", "9:16"]);
    expect(shape.value).toBe("");
    expect([latest(A).image.w, latest(A).image.h]).toEqual([960, 480]);
    fireEvent.change(shape, { target: { value: "4:5" } });
    await waitFor(() => expect([latest(A).image.w, latest(A).image.h]).toEqual([704, 880]));
    fireEvent.change(shape, { target: { value: "" } });
    await waitFor(() => expect([latest(A).image.w, latest(A).image.h]).toEqual([960, 480]));
  });
});
