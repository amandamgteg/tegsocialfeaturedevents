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
  { id: "c-1", title: "Event c", url: "https://events.example.com/c", date: iso(3), tags: ["x"], starred: true },
];
// a and c have no image; b has one. checks decides what the paste check says.
let checks: string[];
let verdict: (url: string) => { ok: true; imageUrl: string } | { ok: false; reason: string };
function stub() {
  checks = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/events") return Response.json(feed);
      const body = JSON.parse(String(init?.body));
      if (path === "/api/check-image") {
        checks.push(body.url);
        return Response.json(verdict(body.url));
      }
      return Response.json(body.url.endsWith("/b") ? { status: "resolved", imageUrl: "https://img.example.com/b.jpg" } : { status: "failed", reason: "nothing" });
    }),
  );
}
const paste = (title: string, value: string) => {
  fireEvent.change(screen.getByLabelText(`Paste an image link for ${title}`), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: `Use this image for ${title}` }));
};

beforeEach(() => {
  localStorage.clear();
  verdict = (url) => (url.endsWith(".jpg") ? { ok: true, imageUrl: url } : { ok: false, reason: "That link is a web page, not an image." });
  stub();
});
afterEach(() => vi.unstubAllGlobals());

describe("EventsApp: pasting an image link", () => {
  it("a good link makes the image appear, counts it, and makes the card selectable", async () => {
    render(<EventsApp />);
    await screen.findByText("3 events found · 1 image loaded");
    expect(screen.queryByRole("checkbox", { name: "Select Event a" })).toBeNull();
    paste("Event a", "https://img.example.com/mine.jpg");
    await screen.findByText("3 events found · 2 images loaded");
    expect(checks).toEqual(["https://img.example.com/mine.jpg"]);
    expect(document.querySelector(`img[src="/api/image?url=${encodeURIComponent("https://img.example.com/mine.jpg")}"]`)).not.toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Event a" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.queryByLabelText("Paste an image link for Event a")).toBeNull(); // no paste box any more
  });
  it("a refused link leaves the card exactly as before and says why", async () => {
    render(<EventsApp />);
    await screen.findByText("3 events found · 1 image loaded");
    paste("Event a", "https://example.com/page");
    expect(await screen.findByRole("alert")).toHaveTextContent("That link is a web page, not an image.");
    expect(screen.getByText("3 events found · 1 image loaded")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Select Event a" })).toBeNull();
    expect(screen.getByLabelText("Paste an image link for Event a")).toBeInTheDocument();
  });
  it("a refused paste does not clear an earlier good one on another card", async () => {
    render(<EventsApp />);
    await screen.findByText("3 events found · 1 image loaded");
    paste("Event a", "https://img.example.com/mine.jpg");
    await screen.findByText("3 events found · 2 images loaded");
    paste("Event c", "https://example.com/page");
    await screen.findByRole("alert");
    expect(screen.getByText("3 events found · 2 images loaded")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Event a" })).toBeInTheDocument();
  });
  it("a pasted image is not sent back to the lookup when retrying", async () => {
    render(<EventsApp />);
    await screen.findByText("3 events found · 1 image loaded");
    paste("Event a", "https://img.example.com/mine.jpg");
    await screen.findByText("3 events found · 2 images loaded");
    const fetchMock = vi.mocked(globalThis.fetch);
    const before = fetchMock.mock.calls.filter((c) => String(c[0]) === "/api/find-image").length;
    fireEvent.click(screen.getByRole("button", { name: "Retry failed images" })); // only Event c is still failed
    await screen.findByText("3 events found · 2 images loaded");
    const retried = fetchMock.mock.calls.filter((c) => String(c[0]) === "/api/find-image").slice(before).map((c) => JSON.parse(String(c[1]?.body)).url);
    expect(retried).toEqual(["https://events.example.com/c"]);
  });
  it("says so, and changes nothing, if the check itself can't be reached", async () => {
    render(<EventsApp />);
    await screen.findByText("3 events found · 1 image loaded");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    paste("Event a", "https://img.example.com/mine.jpg");
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't check/i);
    expect(screen.getByText("3 events found · 1 image loaded")).toBeInTheDocument();
  });
});
