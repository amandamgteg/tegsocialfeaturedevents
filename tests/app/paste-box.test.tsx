// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CardList } from "@/app/CardList";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({ id: `e${i}`, title: `Event ${i}`, key: `https://example.com/${i}`, url: `https://example.com/${i}`, date: "2026-10-20", dates: ["2026-10-20"], tags: [] });
const bad = { status: "failed" as const, reason: "x" };
const ok = { status: "resolved" as const, imageUrl: "https://img.example.com/a.jpg" };

const paste = (title: string, value: string) => {
  fireEvent.change(screen.getByLabelText(`Paste an image link for ${title}`), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: `Use this image for ${title}` }));
};

describe("paste box on a card with no image", () => {
  it("shows the event link and a paste box on a failed card", () => {
    render(<CardList cards={[card(1)]} images={{ e1: bad }} onPasteImage={async () => ({ ok: true })} />);
    expect(screen.getByRole("link", { name: /event page/i })).toHaveAttribute("href", "https://example.com/1");
    expect(screen.getByLabelText("Paste an image link for Event 1")).toBeInTheDocument();
  });
  it("shows no paste box on a card that has an image, or is still loading", () => {
    render(<CardList cards={[card(1), card(2)]} images={{ e1: ok, e2: "loading" }} onPasteImage={async () => ({ ok: true })} />);
    expect(screen.queryByLabelText(/Paste an image link/)).toBeNull();
  });
  it("shows no paste box when pasting is not wired up", () => {
    render(<CardList cards={[card(1)]} images={{ e1: bad }} />);
    expect(screen.queryByLabelText(/Paste an image link/)).toBeNull();
  });
  it("sends the pasted text and the card to onPasteImage", async () => {
    const onPaste = vi.fn(async () => ({ ok: true as const }));
    render(<CardList cards={[card(1)]} images={{ e1: bad }} onPasteImage={onPaste} />);
    paste("Event 1", "https://img.example.com/new.jpg");
    await waitFor(() => expect(onPaste).toHaveBeenCalledTimes(1));
    expect(onPaste).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }), "https://img.example.com/new.jpg");
  });
  it("shows the reason when the link is refused, and keeps what was typed", async () => {
    render(<CardList cards={[card(1)]} images={{ e1: bad }} onPasteImage={async () => ({ ok: false, reason: "That link is a web page, not an image." })} />);
    paste("Event 1", "https://example.com/page");
    expect(await screen.findByRole("alert")).toHaveTextContent("That link is a web page, not an image.");
    expect((screen.getByLabelText("Paste an image link for Event 1") as HTMLInputElement).value).toBe("https://example.com/page");
    expect(screen.getByRole("link", { name: /event page/i })).toBeInTheDocument(); // card unchanged
  });
  it("clears an old message when the person types again", async () => {
    render(<CardList cards={[card(1)]} images={{ e1: bad }} onPasteImage={async () => ({ ok: false, reason: "nope nope" })} />);
    paste("Event 1", "x");
    await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText("Paste an image link for Event 1"), { target: { value: "xy" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("submits with the Enter key too (a form)", async () => {
    const onPaste = vi.fn(async () => ({ ok: true as const }));
    render(<CardList cards={[card(1)]} images={{ e1: bad }} onPasteImage={onPaste} />);
    const input = screen.getByLabelText("Paste an image link for Event 1");
    fireEvent.change(input, { target: { value: "https://img.example.com/x.jpg" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(onPaste).toHaveBeenCalled());
  });
  it("disables the button while a check is running, so it can't be sent twice", async () => {
    let finish: (r: { ok: true }) => void = () => {};
    const onPaste = vi.fn(() => new Promise<{ ok: true }>((r) => (finish = r)));
    render(<CardList cards={[card(1)]} images={{ e1: bad }} onPasteImage={onPaste} />);
    paste("Event 1", "https://img.example.com/x.jpg");
    expect(screen.getByRole("button", { name: "Use this image for Event 1" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Use this image for Event 1" }));
    expect(onPaste).toHaveBeenCalledTimes(1);
    finish({ ok: true });
  });
  it("does not send an empty box", () => {
    const onPaste = vi.fn(async () => ({ ok: true as const }));
    render(<CardList cards={[card(1)]} images={{ e1: bad }} onPasteImage={onPaste} />);
    fireEvent.click(screen.getByRole("button", { name: "Use this image for Event 1" }));
    expect(onPaste).not.toHaveBeenCalled();
  });
});
