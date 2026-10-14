// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { EventsApp } from "@/app/EventsApp";

const NOW = new Date(2026, 9, 14, 12, 0, 0);
const iso = (offset: number) => {
  const d = new Date(2026, 9, 14 + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ev = (id: string, title: string, url: string, offset: number, tags: string[]) => ({ id, title, url, date: iso(offset), tags, starred: true });

const FEED = [
  ev("a", "Event A", "https://e.com/a", 1, ["games"]),
  ev("b", "Event B", "https://e.com/b", 2, ["music", "games"]),
  ev("e1", "Event E", "https://e.com/e", 3, ["talky"]), // multi-day: day 1
  ev("e2", "Event E", "https://e.com/e", 25, ["talky"]), // multi-day: day 2
  ev("c", "Event C", "https://e.com/c", 20, ["music"]),
  ev("d", "Event D", "https://e.com/d", 40, ["far"]), // beyond +30, never reachable
];

let lookups: string[];
function stub(failUrls: string[] = []) {
  lookups = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (String(input) === "/api/events") return Response.json(FEED);
      const card = JSON.parse(String(init?.body));
      lookups.push(card.url);
      return Response.json(failUrls.includes(card.url) ? { status: "failed", reason: "nothing" } : { status: "resolved", imageUrl: `${card.url}/pic.jpg` });
    }),
  );
}

const titles = () => screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent);
const setEnd = (offset: number) => fireEvent.change(screen.getByLabelText("To"), { target: { value: iso(offset) } });
const setStart = (offset: number) => fireEvent.change(screen.getByLabelText("From"), { target: { value: iso(offset) } });
const tag = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const tagButtons = () => within(screen.getByRole("group", { name: /tag/i })).getAllByRole("button").map((b) => b.textContent);
const loaded = async (found: number, images: number) =>
  screen.findByText(`${found} ${found === 1 ? "event" : "events"} found · ${images} ${images === 1 ? "image" : "images"} loaded`);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("EventsApp: date window", () => {
  it("defaults to today through +14, with matching picker values", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    expect((screen.getByLabelText("From") as HTMLInputElement).value).toBe(iso(0));
    expect((screen.getByLabelText("To") as HTMLInputElement).value).toBe(iso(14));
    expect(titles()).toEqual(["Event A", "Event B", "Event E"]);
  });
  it("widening to +30 adds cards, and the multi-day event stays one card", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    setEnd(30);
    await loaded(4, 4);
    expect(titles()).toEqual(["Event A", "Event B", "Event E", "Event C"]);
  });
  it("pulls an end date past +30 back to +30", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    setEnd(30);
    fireEvent.change(screen.getByLabelText("To"), { target: { value: iso(45) } });
    expect((screen.getByLabelText("To") as HTMLInputElement).value).toBe(iso(30));
    expect(titles()).not.toContain("Event D");
  });
  it("looks up only the newly visible cards when the window widens", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    expect(lookups).toHaveLength(3);
    setEnd(30);
    await loaded(4, 4);
    expect(lookups).toEqual(expect.arrayContaining(["https://e.com/c"]));
    expect(lookups).toHaveLength(4);
  });
  it("shows the plain empty message for a window with no starred events", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    setStart(10);
    setEnd(11);
    expect(await screen.findByText(/no starred events/i)).toBeInTheDocument();
  });
});

describe("EventsApp: tag filter", () => {
  it("offers the tags in the current window, sorted", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    expect(tagButtons()).toEqual(["games", "music", "talky"]);
  });
  it("picking several tags shows events with ANY of them, and the counter matches", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    tag("music");
    await loaded(1, 1);
    expect(titles()).toEqual(["Event B"]);
    tag("talky");
    await loaded(2, 2);
    expect(titles()).toEqual(["Event B", "Event E"]);
  });
  it("picking a tag does not shrink the list of options (decision 3)", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    tag("talky");
    await loaded(1, 1);
    expect(tagButtons()).toEqual(["games", "music", "talky"]);
  });
  it("changing the window recomputes the options and drops a picked tag that is no longer offered", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    tag("talky");
    await loaded(1, 1);
    setEnd(1); // only Event A (games) remains
    await loaded(1, 1);
    expect(tagButtons()).toEqual(["games"]);
    expect(titles()).toEqual(["Event A"]); // 'talky' was dropped, so nothing hides Event A
  });
  it("wider windows add tags to the options", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    setEnd(30);
    await loaded(4, 4);
    expect(tagButtons()).toEqual(["games", "music", "talky"]);
    setStart(15);
    await loaded(2, 2); // Event C (+20) and Event E's second day (+25)
    expect(tagButtons()).toEqual(["music", "talky"]);
  });
});

describe("EventsApp: selecting events", () => {
  const box = (title: string) => screen.getByRole("checkbox", { name: `Select ${title}` });

  it("lets a card with an image be selected, and shows a running count", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    fireEvent.click(box("Event A"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(box("Event A"));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });
  it("shows no way to select a card with no image", async () => {
    stub(["https://e.com/b"]);
    render(<EventsApp />);
    await loaded(3, 2);
    expect(screen.queryByRole("checkbox", { name: "Select Event B" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Select Event A" })).toBeInTheDocument();
  });
  it("keeps a selected card selected when a filter hides it, and reports it as hidden", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    fireEvent.click(box("Event A"));
    fireEvent.click(box("Event B"));
    fireEvent.click(box("Event E"));
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    tag("talky"); // hides A and B
    await loaded(1, 1);
    expect(screen.getByText("3 selected (2 hidden by filters)")).toBeInTheDocument();
    tag("talky"); // clear the filter
    await loaded(3, 3);
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    expect(box("Event A")).toBeChecked();
    expect(box("Event B")).toBeChecked();
    expect(box("Event E")).toBeChecked();
  });
  it("has no upper limit on selections", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    for (const t of ["Event A", "Event B", "Event E"]) fireEvent.click(box(t));
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });
  it("keeps a selection when the window changes, even if the card's id changes (keyed by url)", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    fireEvent.click(box("Event E"));
    setEnd(30);
    setStart(10); // Event E's first date drops out; its card now comes from day 2, with a different id
    await waitFor(() => expect(titles()).toEqual(["Event C", "Event E"]));
    await loaded(2, 2);
    expect(box("Event E")).toBeChecked();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });
  it("counts a selected event as hidden when the window moves past it", async () => {
    stub();
    render(<EventsApp />);
    await loaded(3, 3);
    fireEvent.click(box("Event A"));
    setStart(5);
    setEnd(8);
    await screen.findByText(/no starred events/i);
    expect(screen.getByText("1 selected (1 hidden by filters)")).toBeInTheDocument();
  });
  it("deselects a selected card whose image later can't be displayed, since it can't be downloaded", async () => {
    stub();
    const { container } = render(<EventsApp />);
    await loaded(3, 3);
    fireEvent.click(box("Event A"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.error(container.querySelector("img")!);
    await screen.findByText("0 selected");
    expect(screen.queryByRole("checkbox", { name: "Select Event A" })).toBeNull();
  });
});
