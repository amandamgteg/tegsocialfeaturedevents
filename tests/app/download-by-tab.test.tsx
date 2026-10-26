// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SocialEditor } from "@/app/SocialEditor";
import type { EventCard } from "@/lib/types";

const mocks = vi.hoisted(() => ({ renderSlide: vi.fn(), downloadFinished: vi.fn(), downloadLayers: vi.fn(), measureImage: vi.fn() }));
vi.mock("@/lib/slideDraw", () => ({ renderSlide: mocks.renderSlide }));
vi.mock("@/lib/socialZip", () => ({ downloadFinished: mocks.downloadFinished, downloadLayers: mocks.downloadLayers }));
vi.mock("@/app/slideSupport", () => ({
  measureImage: mocks.measureImage,
  canvasTextMeasurer: () => (text: string, size: number) => text.length * size * 0.5,
}));

const card = (id: string, title: string, date: string): EventCard => ({ id, key: `https://events.example.com/${id}`, title, url: `https://events.example.com/${id}`, date, dates: [date], tags: [] });
const items = [
  { card: card("a", "Event a", "2026-10-07"), imageUrl: "https://img.example.com/a.png" },
  { card: card("b", "Event b", "2026-11-07"), imageUrl: "https://img.example.com/b.png" },
];
const props = { items, onClose: vi.fn(), onDownloadOriginals: vi.fn(), downloadingOriginals: false };
const labels = (call: unknown) => (call as { platform: string; title: string }[]).map((s) => `${s.platform}:${s.title}`);

beforeEach(() => {
  mocks.renderSlide.mockReset().mockImplementation(async () => new Blob(["png"], { type: "image/png" }));
  mocks.downloadFinished.mockReset().mockResolvedValue(undefined);
  mocks.downloadLayers.mockReset().mockResolvedValue(undefined);
  mocks.measureImage.mockReset().mockResolvedValue({ width: 800, height: 800 });
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => `blob:test/${++n}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => vi.restoreAllMocks());

const ready = async () => {
  render(<SocialEditor {...props} />);
  await screen.findByAltText("Instagram slide: Event b");
};
const openTikTok = async () => {
  fireEvent.click(screen.getByRole("tab", { name: "TikTok" }));
  await screen.findByAltText("TikTok slide: Event b");
};

describe("Downloads follow the tab that is open", () => {
  it("'Download finished images' on the Instagram tab saves only the Instagram slides", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
    await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalledTimes(1));
    expect(labels(mocks.downloadFinished.mock.calls[0][0])).toEqual(["Instagram:Event a", "Instagram:Event b"]);
  });

  it("'Download finished images' on the TikTok tab saves only the TikTok slides, the cover included", async () => {
    await ready();
    await openTikTok();
    fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
    await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalledTimes(1));
    const slides = mocks.downloadFinished.mock.calls[0][0] as { isCover?: boolean }[];
    expect(labels(slides)).toEqual(["TikTok:Cover", "TikTok:Event a", "TikTok:Event b"]);
    expect(slides.filter((s) => s.isCover)).toHaveLength(1);
  });

  it("follows her when she changes tabs between downloads", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
    await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalledTimes(1));
    await openTikTok();
    fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
    await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalledTimes(2));
    expect(labels(mocks.downloadFinished.mock.calls[0][0]).every((l) => l.startsWith("Instagram:"))).toBe(true);
    expect(labels(mocks.downloadFinished.mock.calls[1][0]).every((l) => l.startsWith("TikTok:"))).toBe(true);
  });

  it("'Download layers for Canva' also saves only the slides on the open tab", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Download layers for Canva" }));
    await waitFor(() => expect(mocks.downloadLayers).toHaveBeenCalledTimes(1));
    expect(labels(mocks.downloadLayers.mock.calls[0][0])).toEqual(["Instagram:Event a", "Instagram:Event b"]);
    await openTikTok();
    fireEvent.click(screen.getByRole("button", { name: "Download layers for Canva" }));
    await waitFor(() => expect(mocks.downloadLayers).toHaveBeenCalledTimes(2));
    expect(labels(mocks.downloadLayers.mock.calls[1][0])).toEqual(["TikTok:Cover", "TikTok:Event a", "TikTok:Event b"]);
  });

  it("uses the slides as edited", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Edit slide: Event a" }));
    fireEvent.change(screen.getByLabelText("Top box wording"), { target: { value: "Edited top wording" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
    await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalled());
    const [first] = mocks.downloadFinished.mock.calls[0][0] as { layout: { topBox: { lines: string[] } } }[];
    expect(first.layout.topBox.lines.join(" ")).toBe("Edited top wording");
  });
});
