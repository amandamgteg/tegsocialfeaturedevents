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

describe("TikTok cover", () => {
  it("is the first slide in the TikTok tab, followed by the event slides", async () => {
    render(<SocialEditor {...props} />);
    await screen.findByAltText("Instagram slide: Event a");
    fireEvent.click(screen.getByRole("tab", { name: "TikTok" }));
    await screen.findByAltText("TikTok slide: Event c");
    const alts = screen.getAllByRole("img").map((i) => i.getAttribute("alt"));
    expect(alts).toEqual(["TikTok cover slide", "TikTok slide: Event a", "TikTok slide: Event b", "TikTok slide: Event c"]);
  });

  it("is not on the Instagram tab", async () => {
    render(<SocialEditor {...props} />);
    await screen.findByAltText("Instagram slide: Event a");
    expect(screen.queryByAltText("TikTok cover slide")).toBeNull();
  });

  it("collages every picked event, with the top box and no dates or titles", async () => {
    render(<SocialEditor {...props} />);
    await openCover();
    expect(order()).toEqual([KEY("a"), KEY("b"), KEY("c")]);
    expect(latest().topBox.lines).toEqual(["Upcoming events from", "our calendar..."]);
    expect("caption" in latest()).toBe(false);
  });

  describe("editing the cover", () => {
    it("changes the top box wording, and remembers it under the cover", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      type(panel, "Top box wording", "This week in Toronto");
      await waitFor(() => expect(latest().topBox.lines.join(" ")).toBe("This week in Toronto"));
      expect(loadEdits(COVER_KEY)).toEqual({ topText: "This week in Toronto" });
    });

    it("starts with the first picture selected, and lets her select another", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      expect(within(panel).getByRole("button", { name: "Select image: Event a" })).toHaveAttribute("aria-pressed", "true");
      select(panel, "Event b");
      expect(within(panel).getByRole("button", { name: "Select image: Event b" })).toHaveAttribute("aria-pressed", "true");
      expect(within(panel).getByRole("button", { name: "Select image: Event a" })).toHaveAttribute("aria-pressed", "false");
    });

    it("moves a picture by dragging it, and leaves the others alone", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      const before = { a: image("a"), b: image("b"), c: image("c") };
      drag(within(panel).getByRole("button", { name: "Move image: Event b" }), 10, 20);
      await waitFor(() => expect([image("b").x, image("b").y]).toEqual([before.b.x + 30, before.b.y + 60]));
      expect([image("a").x, image("a").y]).toEqual([before.a.x, before.a.y]);
      expect([image("c").x, image("c").y]).toEqual([before.c.x, before.c.y]);
      expect(loadEdits(COVER_KEY).collage?.[KEY("b")]?.pos).toEqual({ x: before.b.x + 30, y: before.b.y + 60 });
    });

    it("keeps a dragged picture inside the slide", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      drag(within(panel).getByRole("button", { name: "Move image: Event a" }), -5000, -5000);
      await waitFor(() => expect([image("a").x, image("a").y]).toEqual([0, 0]));
    });

    it("selects a picture when it is dragged", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      drag(within(panel).getByRole("button", { name: "Move image: Event c" }), 3, 3);
      expect(within(panel).getByRole("button", { name: "Select image: Event c" })).toHaveAttribute("aria-pressed", "true");
    });

    it("makes the selected picture bigger or smaller, keeping its shape and leaving the others", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      const before = { b: image("b"), c: image("c") };
      select(panel, "Event b");
      type(panel, "Image size", "50");
      await waitFor(() => expect(image("b").w).toBe(Math.round(before.b.w / 2)));
      expect(image("b").w / image("b").h).toBeCloseTo(before.b.w / before.b.h, 1);
      expect(image("c").w).toBe(before.c.w);
    });

    it("zooms the selected picture and, in crop mode, moves the picture inside its frame", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      select(panel, "Event b");
      const frame = image("b");
      type(panel, "Zoom", "2");
      await waitFor(() => expect(image("b").source.w).toBe(400));
      fireEvent.click(within(panel).getByRole("button", { name: "Move the picture inside its frame" }));
      drag(within(panel).getByRole("button", { name: "Move image: Event b" }), -20, 0);
      await waitFor(() => expect(image("b").source.x).toBeGreaterThan(200));
      expect([image("b").x, image("b").y, image("b").w, image("b").h]).toEqual([frame.x, frame.y, frame.w, frame.h]);
    });

    it("brings the selected picture forward and sends it back, one step at a time, and remembers the order", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      expect(order()).toEqual([KEY("a"), KEY("b"), KEY("c")]);
      fireEvent.click(within(panel).getByRole("button", { name: "Bring forward" })); // Event a is selected
      await waitFor(() => expect(order()).toEqual([KEY("b"), KEY("a"), KEY("c")]));
      select(panel, "Event c");
      fireEvent.click(within(panel).getByRole("button", { name: "Send back" }));
      await waitFor(() => expect(order()).toEqual([KEY("b"), KEY("c"), KEY("a")]));
      expect(loadEdits(COVER_KEY).order).toEqual([KEY("b"), KEY("c"), KEY("a")]);
    });

    it("cannot bring the front picture forward or send the back one back", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      expect(within(panel).getByRole("button", { name: "Send back" })).toBeDisabled(); // Event a is at the back
      select(panel, "Event c");
      expect(within(panel).getByRole("button", { name: "Bring forward" })).toBeDisabled(); // Event c is at the front
    });

    it("warns when a picture is dragged where TikTok would cover it, and stops when moved back", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      expect(within(panel).queryByText(/TikTok's buttons/i)).toBeNull();
      const box = () => within(panel).getByRole("button", { name: "Move image: Event a" });
      drag(box(), 200, 300);
      expect(await within(panel).findByText(/TikTok's buttons/i)).toBeInTheDocument();
      drag(box(), -200, -300);
      await waitFor(() => expect(within(panel).queryByText(/TikTok's buttons/i)).toBeNull());
    });

    it("resets to the automatic arrangement and forgets the saved cover edits", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      const before = order();
      const autoB = { x: image("b").x, y: image("b").y };
      type(panel, "Top box wording", "changed");
      drag(within(panel).getByRole("button", { name: "Move image: Event b" }), 10, 10);
      fireEvent.click(within(panel).getByRole("button", { name: "Bring forward" }));
      await waitFor(() => expect(image("b").x).not.toBe(autoB.x));
      fireEvent.click(within(panel).getByRole("button", { name: "Reset to original" }));
      await waitFor(() => expect(latest().topBox.lines.join(" ")).toBe("Upcoming events from our calendar..."));
      expect(order()).toEqual(before);
      expect([image("b").x, image("b").y]).toEqual([autoB.x, autoB.y]);
      expect(loadEdits(COVER_KEY)).toEqual({});
    });

    it("remembers the edits when the window is opened again", async () => {
      const first = render(<SocialEditor {...props} />);
      const panel = await openCover();
      type(panel, "Top box wording", "Remember me");
      select(panel, "Event b");
      fireEvent.click(within(panel).getByRole("button", { name: "Bring forward" }));
      await waitFor(() => expect(loadEdits(COVER_KEY).order).toBeTruthy());
      first.unmount();
      mocks.renderSlide.mockClear();
      render(<SocialEditor {...props} />);
      await screen.findByAltText("Instagram slide: Event a");
      fireEvent.click(screen.getByRole("tab", { name: "TikTok" }));
      await screen.findByAltText("TikTok cover slide");
      expect(latest().topBox.lines.join(" ")).toBe("Remember me");
      expect(order()).toEqual([KEY("a"), KEY("c"), KEY("b")]);
    });

    it("keeps the edits until the last of the picked events is over", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openCover();
      type(panel, "Top box wording", "x");
      await waitFor(() => expect(loadEdits(COVER_KEY).topText).toBe("x"));
      const stored = JSON.parse(localStorage.getItem("teg:slide-edits")!);
      expect(stored[COVER_KEY].lastDate).toBe("2026-11-07");
    });
  });

  describe("downloading", () => {
    it("includes the cover among the TikTok slides, marked as the cover", async () => {
      render(<SocialEditor {...props} />);
      await screen.findByAltText("Instagram slide: Event c");
      fireEvent.click(screen.getByRole("tab", { name: "TikTok" }));
      await screen.findByAltText("TikTok cover slide");
      fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
      await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalled());
      const slides = mocks.downloadFinished.mock.calls[0][0] as { platform: string; isCover?: boolean; layout: DrawableLayout }[];
      const cover = slides.filter((s) => s.isCover);
      expect(cover).toHaveLength(1);
      expect(cover[0].platform).toBe("TikTok");
      expect(isCover(cover[0].layout)).toBe(true);
      expect(slides.filter((s) => s.platform === "TikTok" && !s.isCover)).toHaveLength(3);
    });
  });
});
