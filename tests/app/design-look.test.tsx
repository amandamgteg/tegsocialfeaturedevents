// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardList, type ImageStates } from "@/app/CardList";
import { TagFilter } from "@/app/Filters";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({ id: `e${i}`, title: `Event ${i}`, url: `https://e.com/${i}`, date: "2026-10-15", tags: ["Music"] });
const ok: ImageStates = { e1: { status: "resolved", imageUrl: "https://img.example.com/1.jpg" } };

describe("Design I look", () => {
  it("shows the date as a capitalised badge like THU OCT 15", () => {
    render(<CardList cards={[card(1)]} images={ok} />);
    expect(screen.getByText("THU OCT 15")).toBeInTheDocument();
  });
  it("shows + Pick on an unpicked card and 'Picked · tap to undo' on a picked one", () => {
    const { rerender } = render(<CardList cards={[card(1)]} images={ok} selectedUrls={new Set()} onToggleSelect={() => {}} />);
    expect(screen.getByText("+ Pick")).toBeInTheDocument();
    rerender(<CardList cards={[card(1)]} images={ok} selectedUrls={new Set(["https://e.com/1"])} onToggleSelect={() => {}} />);
    expect(screen.getByText("Picked · tap to undo")).toBeInTheDocument();
  });
  it("shows 'Needs an image first' on a card with no image", () => {
    render(<CardList cards={[card(1)]} images={{ e1: { status: "failed", reason: "x" } }} selectedUrls={new Set()} onToggleSelect={() => {}} />);
    expect(screen.getByText("Needs an image first")).toBeDisabled();
    expect(screen.getByText("No image found yet")).toBeInTheDocument();
  });
  it("names the step: Tap Pick on the ones you want", () => {
    render(<CardList cards={[card(1)]} images={ok} />);
    expect(screen.getByText(/on the ones you want/)).toBeInTheDocument();
  });
  it("puts an icon on a tag button without changing its name", () => {
    render(<TagFilter options={["Music"]} selected={[]} onChange={() => {}} />);
    const b = screen.getByRole("button", { name: "Music" });
    expect(b.querySelector("svg")).not.toBeNull();
  });
});
