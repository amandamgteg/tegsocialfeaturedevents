// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SocialEditor } from "@/app/SocialEditor";
import { PartialDownloadError } from "@/lib/download";
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

describe("Download layers for Canva", () => {
  it("is a separate button next to the other downloads, with a note about unzipping", async () => {
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    expect(screen.getByRole("button", { name: "Download layers for Canva" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download finished images" })).toBeInTheDocument();
    expect(screen.getByText(/unzip/i)).toBeInTheDocument();
  });

  it("does nothing until it is pressed, and the finished-images button does not make layers", async () => {
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
    await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalled());
    expect(mocks.downloadLayers).not.toHaveBeenCalled();
  });

  it("makes layers for every slide, Instagram and TikTok, whichever tab is open, and does not make the finished ZIP", async () => {
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    fireEvent.click(screen.getByRole("button", { name: "Download layers for Canva" }));
    await waitFor(() => expect(mocks.downloadLayers).toHaveBeenCalledTimes(1));
    expect(mocks.downloadFinished).not.toHaveBeenCalled();
    const slides = mocks.downloadLayers.mock.calls[0][0] as { platform: string; title: string; isCover?: boolean }[];
    expect(slides.map((s) => `${s.platform}:${s.title}`)).toEqual(["Instagram:Event a", "Instagram:Event b", "TikTok:Cover", "TikTok:Event a", "TikTok:Event b"]);
    expect(slides.filter((s) => s.isCover)).toHaveLength(1);
  });

  it("uses the slides as edited", async () => {
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    fireEvent.click(screen.getByRole("button", { name: "Edit slide: Event a" }));
    fireEvent.change(screen.getByLabelText("Top box wording"), { target: { value: "Edited top wording" } });
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: "Download layers for Canva" }));
    await waitFor(() => expect(mocks.downloadLayers).toHaveBeenCalled());
    const [first] = mocks.downloadLayers.mock.calls[0][0] as { layout: { topBox: { lines: string[] } } }[];
    expect(first.layout.topBox.lines.join(" ")).toBe("Edited top wording");
  });

  it("tells her when it did not work, and when only some slides could be made", async () => {
    mocks.downloadLayers.mockRejectedValueOnce(new Error("nope"));
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    fireEvent.click(screen.getByRole("button", { name: "Download layers for Canva" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't/i);
    mocks.downloadLayers.mockRejectedValueOnce(new PartialDownloadError(["Event b"], 3));
    fireEvent.click(screen.getByRole("button", { name: "Download layers for Canva" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Event b/));
  });

  it("shows that it is working while it makes the layers", async () => {
    let finish: () => void = () => {};
    mocks.downloadLayers.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    render(<SocialEditor {...props} />);
    await screen.findAllByRole("img");
    fireEvent.click(screen.getByRole("button", { name: "Download layers for Canva" }));
    expect(await screen.findByRole("button", { name: "Preparing layers…" })).toBeDisabled();
    finish();
    await screen.findByRole("button", { name: "Download layers for Canva" });
  });
});
