// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EventsApp } from "@/app/EventsApp";

const iso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const feed = [
  { id: "a-1", title: "Event a", url: "https://events.example.com/a", date: iso(1), tags: ["x"], starred: true },
  { id: "b-1", title: "Event b", url: "https://events.example.com/b", date: iso(2), tags: ["x"], starred: true },
];
const proxied = (u: string) => `/api/image?url=${encodeURIComponent(u)}`;
const hasImg = (u: string) => document.querySelector(`img[src="${proxied(u)}"]`) !== null;
const FOUND_A = "https://img.example.com/a.jpg";
const MINE = "https://img.example.com/mine.jpg";
let lookups: string[];

beforeEach(() => {
  localStorage.clear();
  lookups = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/events") return Response.json(feed);
      const body = JSON.parse(String(init?.body));
      if (path === "/api/check-image") return Response.json(body.url.endsWith(".jpg") ? { ok: true, imageUrl: body.url } : { ok: false, reason: "That link is a web page, not an image." });
      lookups.push(body.url);
      return Response.json({ status: "resolved", imageUrl: `https://img.example.com/${body.url.split("/").pop()}.jpg` });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const replace = (title: string, value: string) => {
  fireEvent.click(screen.getByRole("button", { name: `Use a different image for ${title}` }));
  fireEvent.change(screen.getByLabelText(`Paste an image link for ${title}`), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: `Use this image for ${title}` }));
};
const loaded = () => screen.findByText("2 events found · 2 images loaded");

describe("EventsApp: using a different image", () => {
  it("swaps the card's image for the pasted one, keeping the other cards", async () => {
    render(<EventsApp />);
    await loaded();
    replace("Event a", MINE);
    await vi.waitFor(() => expect(hasImg(MINE)).toBe(true));
    expect(hasImg(FOUND_A)).toBe(false);
    expect(hasImg("https://img.example.com/b.jpg")).toBe(true);
    expect(screen.getByText("2 events found · 2 images loaded")).toBeInTheDocument();
  });

  it("uses the new image on the photo wall once the event is picked", async () => {
    render(<EventsApp />);
    await loaded();
    replace("Event a", MINE);
    await vi.waitFor(() => expect(hasImg(MINE)).toBe(true));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Event a" }));
    const wallImg = screen.getByRole("complementary", { name: "Your photo wall" }).querySelector("img")!;
    expect(wallImg.getAttribute("src")).toBe(proxied(MINE));
  });

  it("changes nothing, and says why, when the link is refused", async () => {
    render(<EventsApp />);
    await loaded();
    replace("Event a", "https://example.com/page");
    expect(await screen.findByRole("alert")).toHaveTextContent("That link is a web page, not an image.");
    expect(hasImg(FOUND_A)).toBe(true);
    expect(screen.queryByRole("button", { name: "Use the original image for Event a" })).toBeNull();
  });

  it("is remembered after a refresh", async () => {
    const first = render(<EventsApp />);
    await loaded();
    replace("Event a", MINE);
    await vi.waitFor(() => expect(hasImg(MINE)).toBe(true));
    first.unmount();
    render(<EventsApp />);
    await loaded();
    expect(hasImg(MINE)).toBe(true);
    expect(hasImg(FOUND_A)).toBe(false);
  });

  it("'Use the original image' brings the found image back, and it stays back after a refresh", async () => {
    const first = render(<EventsApp />);
    await loaded();
    replace("Event a", MINE);
    await vi.waitFor(() => expect(hasImg(MINE)).toBe(true));
    fireEvent.click(screen.getByRole("button", { name: "Use the original image for Event a" }));
    await vi.waitFor(() => expect(hasImg(FOUND_A)).toBe(true));
    expect(hasImg(MINE)).toBe(false);
    expect(screen.queryByRole("button", { name: "Use the original image for Event a" })).toBeNull();
    first.unmount();
    render(<EventsApp />);
    await loaded();
    expect(hasImg(FOUND_A)).toBe(true);
  });

  it("finds the original again if it was not kept, when asked for after a refresh", async () => {
    const first = render(<EventsApp />);
    await loaded();
    replace("Event a", MINE);
    await vi.waitFor(() => expect(hasImg(MINE)).toBe(true));
    first.unmount();
    localStorage.removeItem("teg:image:https://events.example.com/a"); // the browser's memory of found images was cleared
    lookups.length = 0;
    render(<EventsApp />);
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Use the original image for Event a" }));
    await vi.waitFor(() => expect(hasImg(FOUND_A)).toBe(true));
    expect(lookups).toContain("https://events.example.com/a");
  });

  it("Start over puts the found image back on a replaced card", async () => {
    render(<EventsApp />);
    await loaded();
    replace("Event a", MINE);
    await vi.waitFor(() => expect(hasImg(MINE)).toBe(true));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Event a" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    await vi.waitFor(() => expect(hasImg(FOUND_A)).toBe(true));
    expect(hasImg(MINE)).toBe(false);
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });
});
