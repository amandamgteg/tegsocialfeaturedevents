// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardList, type ImageStates } from "@/app/CardList";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({ id: `e${i}`, title: `Event ${i}`, key: `https://e.com/${i}`, url: `https://e.com/${i}`, date: "2026-10-20", dates: ["2026-10-20"], tags: [] });
const ok = (i: number) => ({ status: "resolved" as const, imageUrl: `https://img.example.com/${i}.jpg` });
const bad = { status: "failed" as const, reason: "x" };

describe("CardList selection", () => {
  it("gives a card with an image a checkbox, and calls onToggleSelect with the card", () => {
    const onToggle = vi.fn();
    render(<CardList cards={[card(1)]} images={{ e1: ok(1) }} selectedUrls={new Set()} hiddenSelected={0} onToggleSelect={onToggle} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Event 1" }));
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "e1", url: "https://e.com/1" }));
  });
  it("shows a selected card's checkbox as checked", () => {
    render(<CardList cards={[card(1)]} images={{ e1: ok(1) }} selectedUrls={new Set(["https://e.com/1"])} hiddenSelected={0} onToggleSelect={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "Select Event 1" })).toBeChecked();
  });
  it("shows no way to select a failed card or a card still loading", () => {
    const images: ImageStates = { e1: bad, e2: "loading" };
    render(<CardList cards={[card(1), card(2), card(3)]} images={images} selectedUrls={new Set()} hiddenSelected={0} onToggleSelect={() => {}} />);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
  it("shows no way to select a card whose image the browser could not display", () => {
    const { container } = render(
      <CardList cards={[card(1)]} images={{ e1: ok(1) }} selectedUrls={new Set()} hiddenSelected={0} onToggleSelect={() => {}} />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
  it("shows the running count, with no hidden clause when 0 are hidden", () => {
    render(<CardList cards={[card(1)]} images={{ e1: ok(1) }} selectedUrls={new Set(["https://e.com/1"])} hiddenSelected={0} onToggleSelect={() => {}} />);
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });
  it("shows how many selected events are hidden by filters", () => {
    render(<CardList cards={[card(1)]} images={{ e1: ok(1) }} selectedUrls={new Set(["https://e.com/1", "https://e.com/8", "https://e.com/9"])} hiddenSelected={2} onToggleSelect={() => {}} />);
    expect(screen.getByText("3 selected (2 hidden by filters)")).toBeInTheDocument();
  });
  it("still shows the count when every card is filtered out", () => {
    render(<CardList cards={[]} images={{}} selectedUrls={new Set(["https://e.com/8"])} hiddenSelected={1} onToggleSelect={() => {}} />);
    expect(screen.getByText("1 selected (1 hidden by filters)")).toBeInTheDocument();
    expect(screen.getByText(/no starred events/i)).toBeInTheDocument();
  });
  it("shows no selection count or checkboxes when selection is not wired up", () => {
    render(<CardList cards={[card(1)]} images={{ e1: ok(1) }} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText(/selected/)).toBeNull();
  });
});
