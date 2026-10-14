// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventsApp } from "@/app/EventsApp";

const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ev = (n: number) => ({ id: `ev${n}`, title: `Event ${n}`, url: `https://events.example.com/${n}`, date: iso(n), tags: ["t"], starred: true });

type Answer = { status: "resolved"; imageUrl: string } | { status: "failed"; reason: string };
function stub(answers: (url: string) => Answer | Promise<Answer>) {
  const lookups: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (String(input) === "/api/events") return Response.json([ev(1), ev(2), ev(3)]);
      const card = JSON.parse(String(init?.body));
      lookups.push(card.url);
      return Response.json(await answers(card.url));
    }),
  );
  return lookups;
}
const good = (url: string): Answer => ({ status: "resolved", imageUrl: `${url}/pic.jpg` });

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("EventsApp: caching and retry", () => {
  it("fills in images and shows the counter", async () => {
    stub(good);
    render(<EventsApp />);
    expect(await screen.findByText("3 events found · 3 images loaded")).toBeInTheDocument();
  });

  it("after a reload, previously found images show with no new lookups", async () => {
    const first = stub(good);
    const { unmount } = render(<EventsApp />);
    await screen.findByText("3 events found · 3 images loaded");
    expect(first).toHaveLength(3);
    unmount();

    const second = stub(good);
    render(<EventsApp />);
    expect(await screen.findByText("3 events found · 3 images loaded")).toBeInTheDocument();
    expect(second).toHaveLength(0);
  });

  it("retries only the failed cards, then updates the counter", async () => {
    let healthy = false;
    const lookups = stub((url) => (url.endsWith("/2") && !healthy ? { status: "failed", reason: "nothing" } : good(url)));
    render(<EventsApp />);
    await screen.findByText("3 events found · 2 images loaded");
    expect(lookups).toHaveLength(3);

    healthy = true;
    fireEvent.click(screen.getByRole("button", { name: "Retry failed images" }));
    await screen.findByText("3 events found · 3 images loaded");
    expect(lookups.slice(3)).toEqual(["https://events.example.com/2"]);
    expect(screen.queryByRole("button", { name: "Retry failed images" })).toBeNull();
  });

  it("keeps a card failed when the retry fails again, and the button stays", async () => {
    const lookups = stub((url) => (url.endsWith("/2") ? { status: "failed", reason: "nothing" } : good(url)));
    render(<EventsApp />);
    await screen.findByText("3 events found · 2 images loaded");
    fireEvent.click(screen.getByRole("button", { name: "Retry failed images" }));
    await waitFor(() => expect(lookups).toHaveLength(4));
    expect(await screen.findByText("3 events found · 2 images loaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry failed images" })).toBeInTheDocument();
  });

  it("works when browser storage is unavailable, looking images up every time", async () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const lookups = stub(good);
    render(<EventsApp />);
    expect(await screen.findByText("3 events found · 3 images loaded")).toBeInTheDocument();
    expect(lookups).toHaveLength(3);
    vi.restoreAllMocks();
  });

  it("treats an image the browser cannot display as failed, forgets it, and retries it", async () => {
    const lookups = stub(good);
    const { container } = render(<EventsApp />);
    await screen.findByText("3 events found · 3 images loaded");
    fireEvent.error(container.querySelectorAll("img")[0]);
    await screen.findByText("3 events found · 2 images loaded");
    expect(localStorage.length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Retry failed images" }));
    await screen.findByText("3 events found · 3 images loaded");
    expect(lookups).toHaveLength(4);
  });
});
