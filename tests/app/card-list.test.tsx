// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardList } from "@/app/CardList";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({
  id: `e${i}`,
  title: `Event ${i}`,
  url: `https://example.com/${i}`,
  date: "2026-10-20",
  tags: ["making", "nerdy"],
});

describe("CardList", () => {
  it("shows a plain empty message with zero cards", () => {
    render(<CardList cards={[]} />);
    expect(screen.getByText(/no starred events/i)).toBeInTheDocument();
    expect(screen.queryByText(/events found/i)).toBeNull();
  });
  it("shows 'N events found' for N cards", () => {
    render(<CardList cards={[card(1), card(2), card(3)]} />);
    expect(screen.getByText("3 events found")).toBeInTheDocument();
  });
  it("says '1 event found' for a single card", () => {
    render(<CardList cards={[card(1)]} />);
    expect(screen.getByText("1 event found")).toBeInTheDocument();
  });
  it("shows date, title, tags and a placeholder, and nothing else", () => {
    const { container } = render(<CardList cards={[card(1)]} />);
    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("2026-10-20")).toBeInTheDocument();
    expect(screen.getByText("making")).toBeInTheDocument();
    expect(screen.getByText("nerdy")).toBeInTheDocument();
    expect(container.querySelector("[data-testid='image-placeholder']")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
  it("renders cards in the order given", () => {
    render(<CardList cards={[card(2), card(1)]} />);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(["Event 2", "Event 1"]);
  });
});
