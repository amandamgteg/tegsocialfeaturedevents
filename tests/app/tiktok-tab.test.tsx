// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { SocialEditor } from "@/app/SocialEditor";
import { loadEdits } from "@/lib/slideEdits";
import type { AnyLayout } from "@/lib/slideLayout";
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
const KEY_A = "https://events.example.com/a";
const TIKTOK_KEY_A = `tiktok|${KEY_A}`;

const tiktokLayouts = (url: string): AnyLayout[] => mocks.renderSlide.mock.calls.map((c) => c[0]).filter((l: AnyLayout) => l.image?.url === url && !("topBox" in l));
const latest = (url: string) => tiktokLayouts(url).at(-1)!;

async function openTikTokTab() {
  await screen.findByAltText("Instagram slide: Event a");
  fireEvent.click(screen.getByRole("tab", { name: "TikTok" }));
  await screen.findByAltText("TikTok slide: Event a");
}
async function openPanel(title = "Event a") {
  fireEvent.click(screen.getByRole("button", { name: `Edit slide: ${title}` }));
  const panel = screen.getByRole("dialog", { name: `Edit slide: ${title}` });
  vi.spyOn(within(panel).getByTestId("slide-stage"), "getBoundingClientRect").mockReturnValue({ width: 360, height: 640, left: 0, top: 0, right: 360, bottom: 640, x: 0, y: 0, toJSON() {} });
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
  mocks.measureImage.mockReset().mockImplementation(async (url: string) => (url === A ? { width: 1600, height: 800 } : { width: 800, height: 800 }));
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => `blob:test/${++n}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => vi.restoreAllMocks());

describe("TikTok tab", () => {
  it("has Instagram and TikTok tabs, with Instagram showing first", async () => {
    render(<SocialEditor {...props} />);
    await screen.findByAltText("Instagram slide: Event a");
    expect(screen.getByRole("tab", { name: "Instagram" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "TikTok" })).toHaveAttribute("aria-selected", "false");
  });

  it("shows one TikTok slide per picked event, in the order given, and hides the Instagram ones", async () => {
    render(<SocialEditor {...props} />);
    await openTikTokTab();
    expect(screen.getByRole("tab", { name: "TikTok" })).toHaveAttribute("aria-selected", "true");
    const alts = (await screen.findAllByRole("img")).map((i) => i.getAttribute("alt"));
    expect(alts).toEqual(["TikTok cover slide", "TikTok slide: Event a", "TikTok slide: Event b"]);
  });

  it("draws each TikTok slide with the date and title and no top box", async () => {
    render(<SocialEditor {...props} />);
    await openTikTokTab();
    await screen.findByAltText("TikTok slide: Event b");
    expect(latest(A).caption.lines).toEqual(["Oct 7 - Event a"]);
    expect("topBox" in latest(A)).toBe(false);
  });

  it("goes back to the Instagram slides", async () => {
    render(<SocialEditor {...props} />);
    await openTikTokTab();
    fireEvent.click(screen.getByRole("tab", { name: "Instagram" }));
    expect(await screen.findByAltText("Instagram slide: Event a")).toBeInTheDocument();
  });

  describe("editing a TikTok slide", () => {
    it("has no top box wording, but has the date-and-title wording", async () => {
      render(<SocialEditor {...props} />);
      await openTikTokTab();
      const panel = await openPanel();
      expect(within(panel).queryByLabelText("Top box wording")).toBeNull();
      expect(within(panel).queryByRole("button", { name: "Move the top box" })).toBeNull();
      expect((within(panel).getByLabelText("Date and title wording") as HTMLTextAreaElement).value).toBe("Oct 7 - Event a");
    });

    it("changes the wording, and remembers it apart from the Instagram slide of the same event", async () => {
      render(<SocialEditor {...props} />);
      await openTikTokTab();
      const panel = await openPanel();
      type(panel, "Date and title wording", "Oct 7: TikTok only");
      await waitFor(() => expect(latest(A).caption.lines).toEqual(["Oct 7: TikTok only"]));
      expect(loadEdits(TIKTOK_KEY_A)).toEqual({ captionText: "Oct 7: TikTok only" });
      expect(loadEdits(KEY_A)).toEqual({});
    });

    it("moves a box by dragging", async () => {
      render(<SocialEditor {...props} />);
      await openTikTokTab();
      const panel = await openPanel();
      const before = latest(A).caption;
      drag(within(panel).getByRole("button", { name: "Move the date and title box" }), 0, 20);
      await waitFor(() => expect(latest(A).caption.y).toBe(before.y + 60));
    });

    it("'Fill square' fits a wide picture into an 800 by 800 square, and turns off again", async () => {
      render(<SocialEditor {...props} />);
      await openTikTokTab();
      const panel = await openPanel();
      expect([latest(A).image.w, latest(A).image.h]).toEqual([800, 400]);
      const fill = within(panel).getByRole("button", { name: "Fill square" });
      expect(fill).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(fill);
      await waitFor(() => expect([latest(A).image.w, latest(A).image.h]).toEqual([800, 800]));
      expect(fill).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(fill);
      await waitFor(() => expect([latest(A).image.w, latest(A).image.h]).toEqual([800, 400]));
    });

    it("lets her zoom and choose the part shown after 'Fill square'", async () => {
      render(<SocialEditor {...props} />);
      await openTikTokTab();
      const panel = await openPanel();
      fireEvent.click(within(panel).getByRole("button", { name: "Fill square" }));
      type(panel, "Zoom", "2");
      await waitFor(() => expect(latest(A).image.source.w).toBe(400));
      fireEvent.click(within(panel).getByRole("button", { name: "Move the picture inside its frame" }));
      drag(within(panel).getByRole("button", { name: "Move the image" }), -30, 0);
      await waitFor(() => expect(latest(A).image.source.x).toBeGreaterThan(600));
      expect([latest(A).image.w, latest(A).image.h]).toEqual([800, 800]);
    });

    it("warns when a box is dragged where TikTok's buttons or description would cover it, and stops when moved back", async () => {
      render(<SocialEditor {...props} />);
      await openTikTokTab();
      const panel = await openPanel();
      expect(within(panel).queryByText(/TikTok's buttons/i)).toBeNull();
      const box = () => within(panel).getByRole("button", { name: "Move the date and title box" });
      drag(box(), 100, 0);
      expect(await within(panel).findByText(/TikTok's buttons/i)).toBeInTheDocument();
      drag(box(), -100, 0);
      await waitFor(() => expect(within(panel).queryByText(/TikTok's buttons/i)).toBeNull());
    });

    it("resets to the original, forgetting the saved TikTok edits only", async () => {
      render(<SocialEditor {...props} />);
      await openTikTokTab();
      const panel = await openPanel();
      fireEvent.click(within(panel).getByRole("button", { name: "Fill square" }));
      type(panel, "Date and title wording", "changed");
      await waitFor(() => expect(loadEdits(TIKTOK_KEY_A).square).toBe(true));
      fireEvent.click(within(panel).getByRole("button", { name: "Reset to original" }));
      await waitFor(() => expect(latest(A).caption.lines).toEqual(["Oct 7 - Event a"]));
      expect([latest(A).image.w, latest(A).image.h]).toEqual([800, 400]);
      expect(loadEdits(TIKTOK_KEY_A)).toEqual({});
    });

    it("remembers the edits when the window is opened again", async () => {
      const first = render(<SocialEditor {...props} />);
      await openTikTokTab();
      const panel = await openPanel();
      fireEvent.click(within(panel).getByRole("button", { name: "Fill square" }));
      await waitFor(() => expect(loadEdits(TIKTOK_KEY_A).square).toBe(true));
      first.unmount();
      mocks.renderSlide.mockClear();
      render(<SocialEditor {...props} />);
      await screen.findByAltText("Instagram slide: Event a");
      fireEvent.click(screen.getByRole("tab", { name: "TikTok" }));
      await screen.findByAltText("TikTok slide: Event a");
      expect([latest(A).image.w, latest(A).image.h]).toEqual([800, 800]);
    });
  });

  describe("downloading", () => {
    it("puts both the Instagram and the TikTok slides in the finished-images download", async () => {
      render(<SocialEditor {...props} />);
      await screen.findByAltText("Instagram slide: Event b");
      fireEvent.click(screen.getByRole("tab", { name: "TikTok" }));
      await screen.findByAltText("TikTok slide: Event b");
      fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
      await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalled());
      const slides = mocks.downloadFinished.mock.calls[0][0] as { platform: string; title: string }[];
      expect(slides.map((s) => `${s.platform}:${s.title}`).sort()).toEqual(["Instagram:Event a", "Instagram:Event b", "TikTok:Cover", "TikTok:Event a", "TikTok:Event b"]);
    });
  });
});
