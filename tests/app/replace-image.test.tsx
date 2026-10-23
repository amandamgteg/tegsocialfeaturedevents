// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CardList } from "@/app/CardList";
import type { EventCard } from "@/lib/types";

const card = (i: number): EventCard => ({ id: `e${i}`, title: `Event ${i}`, key: `https://example.com/${i}`, url: `https://example.com/${i}`, date: "2026-10-20", dates: ["2026-10-20"], tags: [] });
const bad = { status: "failed" as const, reason: "x" };
const ok = { status: "resolved" as const, imageUrl: "https://img.example.com/a.jpg" };
const openForm = (title: string) => fireEvent.click(screen.getByRole("button", { name: `Use a different image for ${title}` }));
const submit = (title: string, value: string) => {
  fireEvent.change(screen.getByLabelText(`Paste an image link for ${title}`), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: `Use this image for ${title}` }));
};

describe("using a different image on a card that already has one", () => {
  it("offers 'Use a different image' on a card with an image, with the paste box hidden until asked", () => {
    render(<CardList cards={[card(1)]} images={{ e1: ok }} onPasteImage={async () => ({ ok: true })} />);
    expect(screen.getByRole("button", { name: "Use a different image for Event 1" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Paste an image link for Event 1")).toBeNull();
  });

  it("is not offered on a card with no image (it has the paste box already), a loading card, or when pasting is not wired up", () => {
    const { rerender } = render(<CardList cards={[card(1), card(2)]} images={{ e1: bad, e2: "loading" }} onPasteImage={async () => ({ ok: true })} />);
    expect(screen.queryByRole("button", { name: /Use a different image/ })).toBeNull();
    rerender(<CardList cards={[card(1)]} images={{ e1: ok }} />);
    expect(screen.queryByRole("button", { name: /Use a different image/ })).toBeNull();
  });

  it("opens a paste box when asked, and Cancel closes it", () => {
    render(<CardList cards={[card(1)]} images={{ e1: ok }} onPasteImage={async () => ({ ok: true })} />);
    openForm("Event 1");
    expect(screen.getByLabelText("Paste an image link for Event 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Paste an image link for Event 1")).toBeNull();
  });

  it("sends the pasted link and the card to onPasteImage, then closes the box when it is accepted", async () => {
    const onPaste = vi.fn(async () => ({ ok: true as const }));
    render(<CardList cards={[card(1)]} images={{ e1: ok }} onPasteImage={onPaste} />);
    openForm("Event 1");
    submit("Event 1", "https://img.example.com/new.jpg");
    await waitFor(() => expect(onPaste).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }), "https://img.example.com/new.jpg"));
    await waitFor(() => expect(screen.queryByLabelText("Paste an image link for Event 1")).toBeNull());
  });

  it("shows the reason when the link is refused, keeps what was typed, and keeps the current image", async () => {
    render(<CardList cards={[card(1)]} images={{ e1: ok }} onPasteImage={async () => ({ ok: false, reason: "That link is a web page, not an image." })} />);
    openForm("Event 1");
    submit("Event 1", "https://example.com/page");
    expect(await screen.findByRole("alert")).toHaveTextContent("That link is a web page, not an image.");
    expect((screen.getByLabelText("Paste an image link for Event 1") as HTMLInputElement).value).toBe("https://example.com/page");
    expect(screen.getByRole("img", { name: "Event 1" })).toBeInTheDocument();
  });

  it("offers 'Use the original image' only for a card whose image was replaced, and calls onRestoreOriginal", () => {
    const onRestore = vi.fn();
    render(<CardList cards={[card(1), card(2)]} images={{ e1: ok, e2: ok }} onPasteImage={async () => ({ ok: true })} replacedUrls={new Set(["https://example.com/1"])} onRestoreOriginal={onRestore} />);
    expect(screen.queryByRole("button", { name: "Use the original image for Event 2" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Use the original image for Event 1" }));
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
  });
});
