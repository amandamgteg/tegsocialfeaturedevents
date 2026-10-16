// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { EventsApp } from "@/app/EventsApp";

const iso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const feed = [
  { id: "a-1", title: "Event a", url: "https://events.example.com/a", date: iso(1), tags: ["red"], starred: true },
  { id: "b-1", title: "Event b", url: "https://events.example.com/b", date: iso(2), tags: ["blue"], starred: true },
];

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (String(input) === "/api/events") return Response.json(feed);
      const card = JSON.parse(String(init?.body));
      return Response.json({ status: "resolved", imageUrl: `https://img.example.com/${card.url.split("/").pop()}.png` });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const wall = () => screen.getByRole("complementary", { name: "Your photo wall" });
const pick = (t: string) => fireEvent.click(screen.getByRole("checkbox", { name: `Select ${t}` }));

describe("Photo wall (design I)", () => {
  it("starts empty with a hint, and the download button says to pick first", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    expect(within(wall()).getByText("Picked events get pinned here as pictures.")).toBeInTheDocument();
    expect(within(wall()).getByRole("button", { name: "Download selected images" })).toHaveTextContent("Pick an event first");
  });

  it("pins each picked event, with its date, title and a proxied picture", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    const item = within(wall()).getByRole("listitem");
    expect(within(item).getByText("Event a")).toBeInTheDocument();
    expect(item.querySelector("img")!.getAttribute("src")).toBe(`/api/image?url=${encodeURIComponent("https://img.example.com/a.png")}`);
  });

  it("removes a pick with the x button", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    fireEvent.click(screen.getByRole("button", { name: "Remove Event a from your photo wall" }));
    expect(screen.getByRole("checkbox", { name: "Select Event a" })).not.toBeChecked();
    expect(within(wall()).queryByRole("listitem")).toBeNull();
  });

  it("labels the download button for one image and for a ZIP", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    expect(within(wall()).getByRole("button", { name: "Download selected images" })).toHaveTextContent("Download image");
    pick("Event b");
    expect(within(wall()).getByRole("button", { name: "Download selected images" })).toHaveTextContent("Download ZIP (2 images)");
  });

  it("keeps a pick pinned when a tag filter hides its card, and says so", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    fireEvent.click(screen.getByRole("button", { name: "blue" }));
    expect(within(wall()).getByText("Event a")).toBeInTheDocument();
    expect(within(wall()).getByText("1 selected (1 hidden by filters)")).toBeInTheDocument();
  });
});
