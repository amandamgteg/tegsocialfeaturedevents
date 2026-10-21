// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardList } from "@/app/CardList";
import { EventsApp } from "@/app/EventsApp";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({ id: `e${i}`, title: `Event ${i}`, key: `https://example.com/${i}`, url: `https://example.com/${i}`, date: "2026-10-20", dates: ["2026-10-20"], tags: [] });
const SRC = "https://img.example.com/pic one.jpg?a=1&b=2";
const resolved = { status: "resolved" as const, imageUrl: SRC };
const proxied = (u: string) => `/api/image?url=${encodeURIComponent(u)}`;
const cardImage = (container: HTMLElement, n = 0) => container.querySelectorAll("li img")[n] as HTMLElement;

describe("larger image view", () => {
  it("opens when a resolved card's image is clicked, showing that image from /api/image", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: resolved }} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(cardImage(container));
    const big = screen.getByRole("dialog").querySelector("img")!;
    expect(big.getAttribute("src")).toBe(proxied(SRC));
    expect(big.getAttribute("alt")).toBe("Event 1");
  });
  it("shows the larger view for the card that was clicked", () => {
    const other = { status: "resolved" as const, imageUrl: "https://img.example.com/second.jpg" };
    const { container } = render(<CardList cards={[card(1), card(2)]} images={{ e1: resolved, e2: other }} />);
    fireEvent.click(cardImage(container, 1));
    expect(screen.getByRole("dialog").querySelector("img")!.getAttribute("src")).toBe(proxied(other.imageUrl));
  });
  it("closes with the Close button", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: resolved }} />);
    fireEvent.click(cardImage(container));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("closes with the Escape key", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: resolved }} />);
    fireEvent.click(cardImage(container));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("ignores other keys", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: resolved }} />);
    fireEvent.click(cardImage(container));
    fireEvent.keyDown(document, { key: "a" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("closes with a click outside the image, but not a click on the image", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: resolved }} />);
    fireEvent.click(cardImage(container));
    fireEvent.click(screen.getByRole("dialog").querySelector("img")!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("lightbox-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("can be opened again after closing", () => {
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: resolved }} />);
    fireEvent.click(cardImage(container));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(cardImage(container));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("gives placeholder and no-image cards nothing to click", () => {
    render(<CardList cards={[card(1), card(2), card(3)]} images={{ e1: "loading", e2: { status: "failed", reason: "x" } }} />);
    expect(screen.queryByRole("button", { name: /view larger/i })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("offers a keyboard-reachable 'View larger' control on a resolved card", () => {
    render(<CardList cards={[card(1)]} images={{ e1: resolved }} />);
    fireEvent.click(screen.getByRole("button", { name: /view larger.*Event 1/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("stops listening for Escape once closed", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { container } = render(<CardList cards={[card(1)]} images={{ e1: resolved }} />);
    fireEvent.click(cardImage(container));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function));
    remove.mockRestore();
  });
});

describe("larger view inside the page", () => {
  const iso = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("opening and closing leaves selection and filters alone", async () => {
    const feed = [
      { id: "a-1", title: "Event a", url: "https://events.example.com/a", date: iso(1), tags: ["red"], starred: true },
      { id: "b-1", title: "Event b", url: "https://events.example.com/b", date: iso(1), tags: ["blue"], starred: true },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) =>
        String(input) === "/api/events"
          ? Response.json(feed)
          : Response.json({ status: "resolved", imageUrl: `${JSON.parse(String(init?.body)).url}/pic.jpg` }),
      ),
    );
    const { container } = render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Event a" }));
    fireEvent.click(screen.getByRole("button", { name: "red" }));
    await screen.findByText(/^1 event found/);
    fireEvent.click(cardImage(container));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "red" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/^1 event found/)).toBeInTheDocument();
  });
});
