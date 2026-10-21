// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardList, type ImageStates } from "@/app/CardList";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({ id: `e${i}`, title: `Event ${i}`, key: `https://example.com/${i}`, url: `https://example.com/${i}`, date: "2026-10-20", dates: ["2026-10-20"], tags: [] });
const ok = (i: number) => ({ status: "resolved" as const, imageUrl: `https://img.example.com/${i}.jpg` });
const bad = { status: "failed" as const, reason: "x" };

describe("Retry failed images button", () => {
  it("shows when at least one card has failed, and calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    render(<CardList cards={[card(0), card(1)]} images={{ e0: ok(0), e1: bad }} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry failed images" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
  it("is hidden when nothing has failed", () => {
    const images: ImageStates = { e0: ok(0), e1: "loading" };
    render(<CardList cards={[card(0), card(1)]} images={images} onRetry={() => {}} />);
    expect(screen.queryByRole("button", { name: "Retry failed images" })).toBeNull();
  });
  it("is hidden when there are no cards", () => {
    render(<CardList cards={[]} images={{}} onRetry={() => {}} />);
    expect(screen.queryByRole("button", { name: "Retry failed images" })).toBeNull();
  });
  it("tells the page when an image cannot be displayed, so it can be retried", () => {
    const onImageError = vi.fn();
    const { container } = render(<CardList cards={[card(0)]} images={{ e0: ok(0) }} onImageError={onImageError} />);
    fireEvent.error(container.querySelector("img")!);
    expect(onImageError).toHaveBeenCalledWith("e0");
  });
});
