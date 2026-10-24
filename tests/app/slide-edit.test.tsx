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

describe("Editing an Instagram slide", () => {
  it("opens an edit window for the slide that was clicked, showing its wording", async () => {
    render(<SocialEditor {...props} />);
    const panel = await openPanel();
    expect((within(panel).getByLabelText("Top box wording") as HTMLTextAreaElement).value).toBe("Upcoming events from our calendar...");
    expect((within(panel).getByLabelText("Date and title wording") as HTMLTextAreaElement).value).toBe("Oct 7 - Event a");
  });

  it("closes with Done and goes back to the slides", async () => {
    render(<SocialEditor {...props} />);
    const panel = await openPanel();
    fireEvent.click(within(panel).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog", { name: "Edit slide: Event a" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Make social images" })).toBeInTheDocument();
  });

  describe("wording", () => {
    it("changing the top-box wording changes only that slide", async () => {
      render(<SocialEditor {...props} />);
      await screen.findByAltText("Instagram slide: Event b");
      const bBefore = layouts(B).length;
      const panel = await openPanel();
      type(panel, "Top box wording", "Upcoming event from our most recent newsletter");
      await waitFor(() => expect(latest(A).topBox.lines.join(" ")).toBe("Upcoming event from our most recent newsletter"));
      expect(layouts(B)).toHaveLength(bBefore);
      expect(latest(B).topBox.lines.join(" ")).toBe("Upcoming events from our calendar...");
    });

    it("changing the date-and-title wording redraws the slide with it, and a longer text makes the box taller", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      const before = latest(A).caption;
      type(panel, "Date and title wording", Array.from({ length: 30 }, (_, i) => `word${i}`).join(" "));
      await waitFor(() => expect(latest(A).caption.h).toBeGreaterThan(before.h));
      expect(latest(A).caption.fontSize).toBe(before.fontSize);
    });
  });

  describe("dragging", () => {
    it("moves the date-and-title box by the distance dragged", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      const before = latest(A).caption;
      drag(within(panel).getByRole("button", { name: "Move the date and title box" }), 10, 20);
      await waitFor(() => expect([latest(A).caption.x, latest(A).caption.y]).toEqual([before.x + 30, before.y + 60]));
    });

    it("moves the top box, and the image follows it", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      const before = latest(A);
      drag(within(panel).getByRole("button", { name: "Move the top box" }), 0, -20);
      await waitFor(() => expect(latest(A).topBox.y).toBe(before.topBox.y - 60));
      expect(latest(A).image.y).toBe(before.image.y - 60);
    });

    it("moves the image, and the date-and-title box follows it", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      const before = latest(A);
      drag(within(panel).getByRole("button", { name: "Move the image" }), 10, 5);
      await waitFor(() => expect([latest(A).image.x, latest(A).image.y]).toEqual([before.image.x + 30, before.image.y + 15]));
      expect(latest(A).caption.y).toBe(latest(A).image.y + latest(A).image.h + 50);
    });

    it("re-centres the image when the date-and-title box is moved, so the gaps stay equal", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      drag(within(panel).getByRole("button", { name: "Move the date and title box" }), 0, 10);
      await waitFor(() => expect(latest(A).caption.y).toBeGreaterThan(1450));
      const [above, below] = gaps(latest(A));
      expect(above).toBe(below);
    });

    it("keeps boxes inside the slide", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      drag(within(panel).getByRole("button", { name: "Move the date and title box" }), -1000, 1000);
      await waitFor(() => expect(latest(A).caption.x).toBe(0));
      expect(latest(A).caption.y + latest(A).caption.h).toBe(1920);
    });

    it("shows the gaps above and below the image", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      expect(within(panel).getByText(/above the image: 50 px/i)).toBeInTheDocument();
      expect(within(panel).getByText(/below the image: 50 px/i)).toBeInTheDocument();
    });

    it("'Even out the gaps' undoes a dragged image position", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      drag(within(panel).getByRole("button", { name: "Move the image" }), 0, 10);
      await waitFor(() => expect(gaps(latest(A))[0]).toBeGreaterThan(50));
      fireEvent.click(within(panel).getByRole("button", { name: "Even out the gaps" }));
      await waitFor(() => expect(gaps(latest(A))).toEqual([50, 50]));
    });
  });

  describe("image size, zoom and crop", () => {
    it("makes the image smaller or larger, keeping the gaps equal", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      const full = latest(A).image.w;
      type(panel, "Image size", "50");
      await waitFor(() => expect(latest(A).image.w).toBe(full / 2));
      expect(gaps(latest(A))).toEqual([50, 50]);
      type(panel, "Image size", "110");
      await waitFor(() => expect(latest(A).image.w).toBeGreaterThan(full));
      expect(gaps(latest(A))).toEqual([50, 50]);
    });

    it("zooms in on the picture without changing the frame", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      const frame = latest(A).image;
      type(panel, "Zoom", "2");
      await waitFor(() => expect(latest(A).image.source.w).toBe(400));
      expect([latest(A).image.w, latest(A).image.h, latest(A).image.x, latest(A).image.y]).toEqual([frame.w, frame.h, frame.x, frame.y]);
    });

    it("in crop mode, dragging moves the picture inside the frame, not the frame", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      type(panel, "Zoom", "2");
      await waitFor(() => expect(latest(A).image.source.w).toBe(400));
      const frame = latest(A).image;
      const crop = within(panel).getByRole("button", { name: "Move the picture inside its frame" });
      expect(crop).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(crop);
      expect(crop).toHaveAttribute("aria-pressed", "true");
      drag(within(panel).getByRole("button", { name: "Move the image" }), -30, 0);
      await waitFor(() => expect(latest(A).image.source.x).toBeGreaterThan(200));
      expect([latest(A).image.x, latest(A).image.y]).toEqual([frame.x, frame.y]);
    });

    it("never lets the crop leave the picture", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      type(panel, "Zoom", "2");
      fireEvent.click(within(panel).getByRole("button", { name: "Move the picture inside its frame" }));
      drag(within(panel).getByRole("button", { name: "Move the image" }), -5000, -5000);
      await waitFor(() => expect(latest(A).image.source.x).toBe(400));
      expect(latest(A).image.source.y).toBe(400);
    });
  });

  describe("link sticker space", () => {
    it("warns when the date-and-title box is dragged into it, and stops when it is dragged back", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      expect(within(panel).queryByText(/link sticker/i)).toBeNull();
      const box = () => within(panel).getByRole("button", { name: "Move the date and title box" });
      drag(box(), 0, 40);
      expect(await within(panel).findByText(/link sticker/i)).toBeInTheDocument();
      drag(box(), 0, -40);
      await waitFor(() => expect(within(panel).queryByText(/link sticker/i)).toBeNull());
    });
  });

  describe("downloading", () => {
    it("downloads the slide as edited, and leaves the other slide alone", async () => {
      render(<SocialEditor {...props} />);
      const panel = await openPanel();
      type(panel, "Top box wording", "Edited top wording");
      type(panel, "Date and title wording", "Oct 7: Edited");
      await waitFor(() => expect(latest(A).caption.lines).toEqual(["Oct 7: Edited"]));
      fireEvent.click(within(panel).getByRole("button", { name: "Done" }));
      fireEvent.click(screen.getByRole("button", { name: "Download finished images" }));
      await waitFor(() => expect(mocks.downloadFinished).toHaveBeenCalled());
      const [a, b] = mocks.downloadFinished.mock.calls[0][0];
      expect(a.layout.topBox.lines.join(" ")).toBe("Edited top wording");
      expect(a.layout.caption.lines).toEqual(["Oct 7: Edited"]);
      expect(b.layout.topBox.lines.join(" ")).toBe("Upcoming events from our calendar...");
      expect(b.layout.caption.lines).toEqual(["Nov 7 - Event b"]);
    });
  });
});
