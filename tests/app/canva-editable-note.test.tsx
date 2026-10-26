// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SocialEditor } from "@/app/SocialEditor";
import type { EventCard } from "@/lib/types";

const mocks = vi.hoisted(() => ({ renderSlide: vi.fn(), measureImage: vi.fn() }));
vi.mock("@/lib/slideDraw", () => ({ renderSlide: mocks.renderSlide }));
vi.mock("@/lib/socialZip", () => ({ downloadFinished: vi.fn(), downloadLayers: vi.fn() }));
vi.mock("@/app/slideSupport", () => ({ measureImage: mocks.measureImage, canvasTextMeasurer: () => (text: string, size: number) => text.length * size * 0.5 }));

const card: EventCard = { id: "a", key: "https://events.example.com/a", title: "Event a", url: "https://events.example.com/a", date: "2026-10-07", dates: ["2026-10-07"], tags: [] };

beforeEach(() => {
  mocks.renderSlide.mockReset().mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  mocks.measureImage.mockReset().mockResolvedValue({ width: 800, height: 800 });
  let n = 0;
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => `blob:test/${++n}`) });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => vi.restoreAllMocks());

describe("the note about editing words in Canva", () => {
  it("says to import the .pptx file to change the words, and to upload the pictures to move pieces", async () => {
    render(<SocialEditor items={[{ card, imageUrl: "https://img.example.com/a.png" }]} onClose={vi.fn()} onDownloadOriginals={vi.fn()} downloadingOriginals={false} />);
    await screen.findAllByRole("img");
    expect(screen.getByText(/Import file/)).toBeInTheDocument();
    expect(screen.getByText(/\.pptx/)).toBeInTheDocument();
    expect(screen.getByText(/upload the pictures/i)).toBeInTheDocument();
  });
});
