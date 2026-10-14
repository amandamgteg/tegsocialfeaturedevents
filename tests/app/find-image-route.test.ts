import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/adapter", () => ({ findImageForCard: vi.fn() }));
import { findImageForCard } from "@/lib/adapter";
import { POST } from "@/app/api/find-image/route";

const find = vi.mocked(findImageForCard);
const card = { id: "a", title: "A", url: "https://example.com/a", date: "2026-10-20", tags: ["x"] };
const post = (body: unknown) =>
  POST(new Request("https://app.test/api/find-image", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

afterEach(() => vi.clearAllMocks());

describe("POST /api/find-image", () => {
  it("returns the adapter's result as JSON", async () => {
    find.mockResolvedValue({ status: "resolved", imageUrl: "https://img.example.com/a.jpg" });
    const res = await post(card);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "resolved", imageUrl: "https://img.example.com/a.jpg" });
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ id: "a", url: card.url }));
  });
  it("returns failed results with status 200 too (a failed lookup is an answer, not a server error)", async () => {
    find.mockResolvedValue({ status: "failed", reason: "nothing" });
    const res = await post(card);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "failed", reason: "nothing" });
  });
  it("returns 400 for invalid JSON", async () => {
    expect((await post("not json")).status).toBe(400);
  });
  it("returns 400 when id, title or url is missing or not a string", async () => {
    expect((await post({ ...card, url: undefined })).status).toBe(400);
    expect((await post({ ...card, id: 5 })).status).toBe(400);
    expect((await post({ title: "x" })).status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  it("marks a resolved result as cacheable", async () => {
    find.mockResolvedValue({ status: "resolved", imageUrl: "https://img.example.com/a.jpg" });
    const res = await post(card);
    expect(res.headers.get("cache-control")).toMatch(/max-age=[1-9]\d*/);
  });
  it("does not mark a failed result as cacheable", async () => {
    find.mockResolvedValue({ status: "failed", reason: "nothing" });
    const res = await post(card);
    expect(res.headers.get("cache-control") ?? "").not.toMatch(/max-age=[1-9]/);
  });
});
