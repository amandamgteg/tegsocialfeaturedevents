// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { SocialEditor } from "@/app/SocialEditor";
import type { EventCard } from "@/lib/types";

const mocks = vi.hoisted(() => ({ renderSlide: vi.fn(), downloadFinished: vi.fn(), measureImage: vi.fn() }));
vi.mock("@/lib/slideDraw", () => ({ renderSlide: mocks.renderSlide }));
vi.mock("@/lib/socialZip", () => ({ downloadFinished: mocks.downloadFinished }));
vi.mock("@/app/slideSupport", () => ({
  measureImage: mocks.measureImage,
  canvasTextMeasurer: () => (text: string, size: number) => text.length * size * 0.5,
}));

const card = (id: string, title: string, date: string, dates = [date]): EventCard => ({ id, key: `https://events.example.com/${id}`, title, url: `https://events.example.com/${id}`, date, dates, tags: [] });
const items = [
  { card: card("a", "Event a", "2026-10-07"), imageUrl: "https://img.example.com/a.png" },
  { card: card("b", "Event b", "2026-11-07", ["2026-11-07", "2026-11-08"]), imageUrl: "https://img.example.com/b.png" },
];
const props = { items, onClose: vi.fn(), onDownloadOriginals: vi.fn(), downloadingOriginals: false };

beforeEach(() => {
  mocks.renderSlide.mockReset().mockImplementation(async () => new Blob(["png"], { type: "image/png" }));
  mocks.downloadFinished.mockReset().mockResolvedValue(undefined);
  mocks.measureImage.mockReset().mockResolvedValue({ width: 800, height: 800 });
  props.onClose.mockReset();
  props.onDownloadOriginals.mockReset();
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => `blob:test/${++n}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => vi.clearAllMocks());

describe("Social image editor", () => {
  it("opens as a dialog with an Instagram tab", async () => {
    render(<SocialEditor {...props} />);
    expect(screen.getByRole("dialog", { name: "Make social images" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Instagram" })).toHaveAttribute("aria-selected", "true");
    await screen.findByAltText("Instagram slide: Event a");
  });

  it("shows one preview per picked event, in the order given", async () => {
    render(<SocialEditor {...props} />);
    const previews = await screen.findAllByRole("img");
    expect(previews.map((p) => p.getAttribute("alt"))).toEqual(["Instagram slide: Event a", "Instagram slide: Event b"]);
  });

  it("draws each slide from the laid-out event, with the date and title", async () => {
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    const layouts = mocks.renderSlide.mock.calls.map((c) => c[0]);
    expect(layouts.map((l) => l.caption.lines[0])).toEqual(["Oct 7 - Event a", "Nov 7-8 - Event b"]);
    expect(layouts.map((l) => l.image.url)).toEqual(["https://img.example.com/a.png", "https://img.example.com/b.png"]);
  });

  it("downloads the finished images for every picked event", async () => {
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
    await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalledTimes(1));
    const slides = mocks.downloadFinished.mock.calls[0][0];
    expect(slides.map((s: { platform: string; date: string; title: string }) => [s.platform, s.date, s.title])).toEqual([
      ["Instagram", "2026-10-07", "Event a"],
      ["Instagram", "2026-11-07", "Event b"],
    ]);
  });

  it("tells her when the download did not work", async () => {
    mocks.downloadFinished.mockRejectedValue(new Error("nope"));
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't/i);
  });

  it("still offers the original event images", async () => {
    render(<SocialEditor {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Download event images" }));
    expect(props.onDownloadOriginals).toHaveBeenCalledTimes(1);
  });

  it("closes", () => {
    render(<SocialEditor {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("still shows the other slides when one picture can't be loaded, and says which", async () => {
    mocks.measureImage.mockImplementation(async (url: string) => {
      if (url.includes("/a.png")) throw new Error("bad");
      return { width: 800, height: 800 };
    });
    render(<SocialEditor {...props} />);
    await screen.findByAltText("Instagram slide: Event b");
    expect(screen.queryByAltText("Instagram slide: Event a")).not.toBeInTheDocument();
    expect(screen.getByText(/Event a/, { selector: "[data-slide-error]" })).toBeInTheDocument();
  });

  it("warns on a slide whose title box runs into the link sticker area", async () => {
    mocks.measureImage.mockResolvedValue({ width: 800, height: 1000 });
    const long = card("c", Array.from({ length: 40 }, (_, i) => `word${i}`).join(" "), "2026-10-07");
    render(<SocialEditor {...props} items={[{ card: long, imageUrl: "https://img.example.com/c.png" }]} />);
    await screen.findAllByRole("img");
    expect(within(screen.getByRole("dialog")).getByText(/link sticker/i)).toBeInTheDocument();
  });

  it("makes no warning for an ordinary slide", async () => {
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    expect(screen.queryByText(/link sticker/i)).not.toBeInTheDocument();
  });
});
