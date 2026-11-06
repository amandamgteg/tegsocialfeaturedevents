// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { SocialEditor } from "@/app/SocialEditor";
import { loadEdits } from "@/lib/slideEdits";
import type { DrawableLayout, TikTokCoverLayout } from "@/lib/slideLayout";
import type { EventCard } from "@/lib/types";

const mocks = vi.hoisted(() => ({ renderSlide: vi.fn(), downloadFinished: vi.fn(), measureImage: vi.fn() }));
vi.mock("@/lib/slideDraw", () => ({ renderSlide: mocks.renderSlide }));
vi.mock("@/lib/socialZip", () => ({ downloadFinished: mocks.downloadFinished }));
vi.mock("@/app/slideSupport", () => ({
  measureImage: mocks.measureImage,
  canvasTextMeasurer: () => (text: string, size: number) => text.length * size * 0.5,
}));

const URLS = { a: "https://img.example.com/a.png", b: "https://img.example.com/b.png", c: "https://img.example.com/c.png" };
const card = (id: string, title: string, date: string): EventCard => ({ id, key: `https://events.example.com/${id}`, title, url: `https://events.example.com/${id}`, date, dates: [date], tags: [] });
const items = [
  { card: card("a", "Event a", "2026-10-07"), imageUrl: URLS.a },
  { card: card("b", "Event b", "2026-10-21"), imageUrl: URLS.b },
  { card: card("c", "Event c", "2026-11-07"), imageUrl: URLS.c },
];
const KEY = (id: string) => `https://events.example.com/${id}`;
const COVER_KEY = "tiktok|cover";
const props = { items, onClose: vi.fn(), onDownloadOriginals: vi.fn(), downloadingOriginals: false };

const isCover = (l: DrawableLayout): l is TikTokCoverLayout => "images" in l;
const covers = () => mocks.renderSlide.mock.calls.map((c) => c[0] as DrawableLayout).filter(isCover);
const latest = () => covers().at(-1)!;
const image = (id: string) => latest().images.find((i) => i.key === KEY(id))!;
const order = () => latest().images.map((i) => i.key);

async function openCover() {
  await screen.findByAltText("Instagram slide: Event a");
  fireEvent.click(screen.getByRole("tab", { name: "TikTok" }));
  await screen.findByAltText("TikTok cover slide");
  fireEvent.click(screen.getByRole("button", { name: "Edit slide: Cover" }));
  const panel = screen.getByRole("dialog", { name: "Edit slide: Cover" });
  vi.spyOn(within(panel).getByTestId("slide-stage"), "getBoundingClientRect").mockReturnValue({ width: 360, height: 640, left: 0, top: 0, right: 360, bottom: 640, x: 0, y: 0, toJSON() {} });
  return panel;
}
const drag = (el: Element, dx: number, dy: number) => {
  fireEvent.mouseDown(el, { clientX: 100, clientY: 100 });
  fireEvent.mouseMove(window, { clientX: 100 + dx, clientY: 100 + dy });
  fireEvent.mouseUp(window, { clientX: 100 + dx, clientY: 100 + dy });
};
const type = (panel: HTMLElement, label: string, value: string) => fireEvent.change(within(panel).getByLabelText(label), { target: { value } });
const select = (panel: HTMLElement, title: string) => fireEvent.click(within(panel).getByRole("button", { name: `Select image: ${title}` }));

beforeEach(() => {
  mocks.renderSlide.mockReset().mockImplementation(async () => new Blob(["png"], { type: "image/png" }));
  mocks.downloadFinished.mockReset().mockResolvedValue(undefined);
  mocks.measureImage.mockReset().mockImplementation(async (url: string) => (url === URLS.c ? { width: 800, height: 1000 } : { width: 800, height: 800 }));
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => `blob:test/${++n}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => vi.restoreAllMocks());

describe("Image shape on the TikTok cover", () => {
  it("lets her pick a shape for the selected picture only", async () => {
    mocks.measureImage.mockResolvedValue({ width: 800, height: 800 });
    render(<SocialEditor {...props} />);
    const panel = await openCover();
    const shape = within(panel).getByLabelText("Image shape") as HTMLSelectElement;
    expect(Array.from(shape.options).map((o) => o.text)).toEqual(["Original", "1:1", "4:5", "16:9", "9:16"]);
    select(panel, "Event b");
    const before = { a: [image("a").w, image("a").h], b: [image("b").w, image("b").h] };
    fireEvent.change(shape, { target: { value: "16:9" } });
    await waitFor(() => expect(image("b").w / image("b").h).toBeCloseTo(16 / 9, 1));
    expect([image("a").w, image("a").h]).toEqual(before.a);
    await waitFor(() => expect(loadEdits(COVER_KEY).collage?.[KEY("b")]?.ratio).toBe("16:9"));
    select(panel, "Event a");
    expect(shape.value).toBe("");
    select(panel, "Event b");
    expect(shape.value).toBe("16:9");
    fireEvent.change(shape, { target: { value: "" } });
    await waitFor(() => expect([image("b").w, image("b").h]).toEqual(before.b));
  });
});
