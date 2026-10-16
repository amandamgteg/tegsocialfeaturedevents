// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CardList } from "@/app/CardList";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({
  id: `e${i}`,
  title: `Event ${i}`,
  url: `https://example.com/${i}`,
  date: "2026-10-20",
  tags: ["making"],
});

describe("CardList title link", () => {
  it("makes each card's title a link to its event page", () => {
    render(<CardList cards={[card(1), card(2)]} />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(within(headings[0]).getByRole("link", { name: "Event 1" })).toHaveAttribute("href", "https://example.com/1");
    expect(within(headings[1]).getByRole("link", { name: "Event 2" })).toHaveAttribute("href", "https://example.com/2");
  });
  it("always opens in a new tab, safely", () => {
    render(<CardList cards={[card(1)]} />);
    const link = screen.getByRole("link", { name: "Event 1" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
  });
  it("does not select the card when the title is clicked", () => {
    let toggled = 0;
    render(<CardList cards={[card(1)]} images={{ e1: { status: "resolved", imageUrl: "https://example.com/a.jpg" } as never }} selectedUrls={new Set()} onToggleSelect={() => { toggled++; }} />);
    screen.getByRole("link", { name: "Event 1" }).click();
    expect(toggled).toBe(0);
  });
});
