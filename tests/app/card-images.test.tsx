// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardList, type ImageStates } from "@/app/CardList";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({ id: `e${i}`, title: `Event ${i}`, key: `https://example.com/${i}`, url: `https://example.com/${i}`, date: "2026-10-20", dates: ["2026-10-20"], tags: ["x"] });
const SRC = "https://img.example.com/pic one.jpg?a=1&b=2";

describe("CardList with image states", () => {
  it("shows a placeholder while a lookup is still running", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: "loading" }} />);
    expect(container.querySelector("[data-testid='image-placeholder']")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
  it("shows a placeholder for a card with no state yet", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{}} />);
    expect(container.querySelector("[data-testid='image-placeholder']")).not.toBeNull();
  });
  it("shows a resolved image through /api/image, never straight from the source site", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: { status: "resolved", imageUrl: SRC } }} />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(`/api/image?url=${encodeURIComponent(SRC)}`);
    expect(img.getAttribute("src")).not.toContain("https://img.example.com/pic");
    expect(img.getAttribute("alt")).toBe("Event 1");
  });
  it("shows a link to the event page when the lookup failed", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: { status: "failed", reason: "x" } }} />);
    const link = screen.getByRole("link", { name: /event page/i });
    expect(link.getAttribute("href")).toBe("https://example.com/1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(container.querySelector("img")).toBeNull();
  });
  it("falls back to the event link if the browser cannot load the image", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: { status: "resolved", imageUrl: SRC } }} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: /event page/i })).toBeInTheDocument();
  });

  describe("counter", () => {
    const states = (n: number, loaded: number): ImageStates =>
      Object.fromEntries(
        Array.from({ length: n }, (_, i) => [`e${i}`, i < loaded ? { status: "resolved" as const, imageUrl: `https://i.example.com/${i}.jpg` } : "loading"]),
      );
    const many = (n: number) => Array.from({ length: n }, (_, i) => card(i));

    it("reads like '12 events found · 9 images loaded'", () => {
      render(<CardList cards={many(12)} images={states(12, 9)} />);
      expect(screen.getByText("12 events found · 9 images loaded")).toBeInTheDocument();
    });
    it("counts failed and in-flight lookups as not loaded", () => {
      const images: ImageStates = { e0: { status: "resolved", imageUrl: "https://i.example.com/0.jpg" }, e1: { status: "failed", reason: "x" }, e2: "loading" };
      render(<CardList cards={many(3)} images={images} />);
      expect(screen.getByText("3 events found · 1 image loaded")).toBeInTheDocument();
    });
    it("starts at zero", () => {
      render(<CardList cards={many(2)} images={{}} />);
      expect(screen.getByText("2 events found · 0 images loaded")).toBeInTheDocument();
    });
    it("drops when the browser cannot display an image, so it matches what is on screen", () => {
      const { container } = render(<CardList cards={many(2)} images={states(2, 2)} />);
      expect(screen.getByText("2 events found · 2 images loaded")).toBeInTheDocument();
      fireEvent.error(container.querySelector("img")!);
      expect(screen.getByText("2 events found · 1 image loaded")).toBeInTheDocument();
    });
    it("still shows the plain empty message with no cards", () => {
      render(<CardList cards={[]} images={{}} />);
      expect(screen.getByText(/no starred events/i)).toBeInTheDocument();
    });
  });
});
