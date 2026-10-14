// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EventsApp } from "@/app/EventsApp";
import { captureDownloads, readZip, readBlob, bytes, type Saved } from "../helpers/download";

const iso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const feed = [
  { id: "a-1", title: "Event a", url: "https://events.example.com/a", date: iso(1), tags: ["red"], starred: true },
  { id: "b-1", title: "Event b", url: "https://events.example.com/b", date: iso(2), tags: ["blue"], starred: true },
  { id: "c-1", title: "Event c", url: "https://events.example.com/c", date: iso(20), tags: ["blue"], starred: true },
];
let saved: Saved[];
let broken: string[];

beforeEach(() => {
  localStorage.clear();
  broken = [];
  saved = captureDownloads();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const path = String(input);
      if (path === "/api/events") return Response.json(feed);
      if (path.startsWith("/api/image?url=")) {
        const url = decodeURIComponent(path.replace("/api/image?url=", ""));
        if (broken.some((b) => url.includes(b))) return new Response("x", { status: 502 });
        return new Response(bytes(url.length), { status: 200, headers: { "content-type": "image/png" } });
      }
      const card = JSON.parse(String(init?.body));
      return Response.json({ status: "resolved", imageUrl: `https://img.example.com/${card.url.split("/").pop()}.png` });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const download = () => screen.getByRole("button", { name: "Download selected images" });
const pick = (t: string) => fireEvent.click(screen.getByRole("checkbox", { name: `Select ${t}` }));

describe("Download button", () => {
  it("is disabled with nothing selected", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    expect(download()).toBeDisabled();
    pick("Event a");
    expect(download()).toBeEnabled();
    pick("Event a");
    expect(download()).toBeDisabled();
  });
  it("saves one selected image as a single file named by date and title", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    fireEvent.click(download());
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe(`${iso(1)}_event-a.png`);
  });
  it("saves two or more as one ZIP, including selections hidden by a filter", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    pick("Event b");
    fireEvent.click(screen.getByRole("button", { name: "blue" })); // hides Event a
    await screen.findByText(/^1 event found/);
    expect(screen.getByText("2 selected (1 hidden by filters)")).toBeInTheDocument();
    fireEvent.click(download());
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toMatch(/\.zip$/);
    expect(Object.keys(await readZip(saved[0].blob)).sort()).toEqual([`${iso(1)}_event-a.png`, `${iso(2)}_event-b.png`]);
  });
  it("includes a selected event the date window has since moved past", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    fireEvent.change(screen.getByLabelText("To"), { target: { value: iso(30) } });
    await screen.findByText(/3 events found · 3 images loaded/);
    pick("Event c");
    fireEvent.change(screen.getByLabelText("From"), { target: { value: iso(10) } });
    await screen.findByText(/^1 event found/);
    expect(screen.getByText("2 selected (1 hidden by filters)")).toBeInTheDocument();
    fireEvent.click(download());
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(Object.keys(await readZip(saved[0].blob)).sort()).toEqual([`${iso(1)}_event-a.png`, `${iso(20)}_event-c.png`]);
  });
  it("tells the user which image failed, and still saves the rest", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    pick("Event b");
    broken = ["/b.png"];
    fireEvent.click(download());
    expect(await screen.findByRole("alert")).toHaveTextContent(/Event b/);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't download/i);
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].name).toBe(`${iso(1)}_event-a.png`);
    expect((await readBlob(saved[0].blob)).length).toBeGreaterThan(0);
  });
  it("clears the failure message on the next download", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    broken = ["/a.png"];
    fireEvent.click(download());
    await screen.findByRole("alert");
    broken = [];
    fireEvent.click(download());
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("downloads images only: the ZIP holds nothing but image files", async () => {
    render(<EventsApp />);
    await screen.findByText(/2 images loaded/);
    pick("Event a");
    pick("Event b");
    fireEvent.click(download());
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(Object.keys(await readZip(saved[0].blob)).every((n) => /\.(png|jpg|webp|gif|avif|svg)$/.test(n))).toBe(true);
  });
});
