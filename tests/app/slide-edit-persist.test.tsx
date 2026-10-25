// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { SocialEditor } from "@/app/SocialEditor";
import { loadEdits, saveEdits, SLIDE_EDITS_KEY } from "@/lib/slideEdits";
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
const card = (id: string, title: string, date: string, dates = [date]): EventCard => ({ id, key: `https://events.example.com/${id}`, title, url: `https://events.example.com/${id}`, date, dates, tags: [] });
const items = [
  { card: card("a", "Event a", "2026-10-07"), imageUrl: A },
  { card: card("b", "Event b", "2026-11-07", ["2026-11-07", "2026-11-08"]), imageUrl: B },
];
const props = { items, onClose: vi.fn(), onDownloadOriginals: vi.fn(), downloadingOriginals: false };
const KEY_A = "https://events.example.com/a";
const KEY_B = "https://events.example.com/b";

const latest = (url: string): SlideLayout => mocks.renderSlide.mock.calls.map((c) => c[0]).filter((l: SlideLayout) => l.image.url === url).at(-1)!;

async function openPanel(title = "Event a") {
  await screen.findByAltText(`Instagram slide: ${title}`);
  fireEvent.click(screen.getByRole("button", { name: `Edit slide: ${title}` }));
  return screen.getByRole("dialog", { name: `Edit slide: ${title}` });
}
const type = (panel: HTMLElement, label: string, value: string) => fireEvent.change(within(panel).getByLabelText(label), { target: { value } });

beforeEach(() => {
  localStorage.clear();
  mocks.renderSlide.mockReset().mockImplementation(async () => new Blob(["png"], { type: "image/png" }));
  mocks.downloadFinished.mockReset().mockResolvedValue(undefined);
  mocks.measureImage.mockReset().mockResolvedValue({ width: 800, height: 800 });
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => `blob:test/${++n}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => vi.restoreAllMocks());

describe("Remembered edits", () => {
  it("saves an edit as it is made", async () => {
    render(<SocialEditor {...props} />);
    const panel = await openPanel();
    type(panel, "Top box wording", "Remember me");
    await waitFor(() => expect(loadEdits(KEY_A)).toEqual({ topText: "Remember me" }));
    expect(loadEdits(KEY_B)).toEqual({});
  });

  it("brings the edits back when the window is opened again, as after a refresh", async () => {
    const first = render(<SocialEditor {...props} />);
    const panel = await openPanel();
    type(panel, "Top box wording", "Remember me");
    type(panel, "Zoom", "2");
    await waitFor(() => expect(loadEdits(KEY_A).zoom).toBe(2));
    first.unmount();
    mocks.renderSlide.mockClear();
    render(<SocialEditor {...props} />);
    await screen.findByAltText("Instagram slide: Event a");
    expect(latest(A).topBox.lines.join(" ")).toBe("Remember me");
    expect(latest(A).image.source.w).toBe(400);
    expect(latest(B).topBox.lines.join(" ")).toBe("Upcoming events from our calendar..."); // the other slide is untouched
  });

  it("keeps the date of a multi-day event as its last day, so edits last until it is over", async () => {
    render(<SocialEditor {...props} />);
    const panel = await openPanel("Event b");
    type(panel, "Top box wording", "festival");
    await waitFor(() => expect(loadEdits(KEY_B)).toEqual({ topText: "festival" }));
    const stored = JSON.parse(localStorage.getItem(SLIDE_EDITS_KEY)!);
    expect(stored[KEY_B].lastDate).toBe("2026-11-08");
  });

  it("works without saving when browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<SocialEditor {...props} />);
    const panel = await openPanel();
    type(panel, "Top box wording", "still works");
    await waitFor(() => expect(latest(A).topBox.lines.join(" ")).toBe("still works"));
  });
});

describe("Reset to original", () => {
  it("puts one slide back to the automatic version and forgets its saved edits", async () => {
    render(<SocialEditor {...props} />);
    const panel = await openPanel();
    type(panel, "Top box wording", "changed");
    type(panel, "Zoom", "3");
    await waitFor(() => expect(latest(A).image.source.w).toBeCloseTo(800 / 3, 2));
    fireEvent.click(within(panel).getByRole("button", { name: "Reset to original" }));
    await waitFor(() => expect(latest(A).topBox.lines.join(" ")).toBe("Upcoming events from our calendar..."));
    expect(latest(A).image.source.w).toBe(800);
    expect(loadEdits(KEY_A)).toEqual({});
    expect((within(panel).getByLabelText("Top box wording") as HTMLTextAreaElement).value).toBe("Upcoming events from our calendar...");
  });

  it("leaves the other slides' edits alone", async () => {
    saveEdits(KEY_B, { topText: "keep me" }, "2026-11-08");
    render(<SocialEditor {...props} />);
    const panel = await openPanel();
    type(panel, "Top box wording", "changed");
    fireEvent.click(within(panel).getByRole("button", { name: "Reset to original" }));
    expect(loadEdits(KEY_B)).toEqual({ topText: "keep me" });
  });
});

describe("Reset everything", () => {
  const setup = async () => {
    saveEdits(KEY_A, { topText: "edit a" }, "2026-10-07");
    saveEdits(KEY_B, { topText: "edit b" }, "2026-11-08");
    saveEdits("https://events.example.com/not-picked", { topText: "elsewhere" }, "2026-12-01");
    render(<SocialEditor {...props} />);
    await screen.findByAltText("Instagram slide: Event a");
  };

  it("asks first, and keeps everything if she changes her mind", async () => {
    await setup();
    fireEvent.click(screen.getByRole("button", { name: "Reset everything" }));
    expect(screen.getByText(/reset all your edits/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep my edits" }));
    expect(screen.queryByText(/reset all your edits/i)).toBeNull();
    expect(loadEdits(KEY_A)).toEqual({ topText: "edit a" });
    expect(loadEdits(KEY_B)).toEqual({ topText: "edit b" });
  });

  it("puts every slide back and forgets every saved edit, including events not picked now", async () => {
    await setup();
    fireEvent.click(screen.getByRole("button", { name: "Reset everything" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, reset everything" }));
    await waitFor(() => expect(latest(A).topBox.lines.join(" ")).toBe("Upcoming events from our calendar..."));
    expect(latest(B).topBox.lines.join(" ")).toBe("Upcoming events from our calendar...");
    expect(localStorage.getItem(SLIDE_EDITS_KEY)).toBeNull();
  });
});
