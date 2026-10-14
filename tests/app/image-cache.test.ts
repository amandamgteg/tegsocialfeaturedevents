// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readCachedImage, cacheResolvedImage, forgetCachedImage } from "@/app/imageCache";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const URL1 = "https://events.example.com/tinker";

describe("image cache", () => {
  it("stores a resolved result under the event URL and reads it back", () => {
    cacheResolvedImage(URL1, "https://img.example.com/a.jpg");
    expect(readCachedImage(URL1)).toBe("https://img.example.com/a.jpg");
  });
  it("is keyed by the event URL, so a different URL is a miss", () => {
    cacheResolvedImage(URL1, "https://img.example.com/a.jpg");
    expect(readCachedImage("https://events.example.com/other")).toBeNull();
  });
  it("returns null when nothing is stored", () => {
    expect(readCachedImage(URL1)).toBeNull();
  });
  it("can forget an entry", () => {
    cacheResolvedImage(URL1, "https://img.example.com/a.jpg");
    forgetCachedImage(URL1);
    expect(readCachedImage(URL1)).toBeNull();
  });
  it("ignores a corrupted entry", () => {
    cacheResolvedImage(URL1, "https://img.example.com/a.jpg");
    const key = Object.keys(localStorage).find((k) => localStorage.getItem(k)?.includes("img.example.com"))!;
    for (const bad of ["not json", "{}", '{"imageUrl":5}', "null", '{"imageUrl":"javascript:alert(1)"}']) {
      localStorage.setItem(key, bad);
      expect(readCachedImage(URL1)).toBeNull();
    }
  });
  it("only keeps http(s) image addresses", () => {
    cacheResolvedImage(URL1, "javascript:alert(1)");
    expect(readCachedImage(URL1)).toBeNull();
  });

  describe("when browser storage is unavailable", () => {
    it("reads return null instead of throwing", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      expect(readCachedImage(URL1)).toBeNull();
    });
    it("writes and deletes do nothing instead of throwing", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      expect(() => cacheResolvedImage(URL1, "https://img.example.com/a.jpg")).not.toThrow();
      expect(() => forgetCachedImage(URL1)).not.toThrow();
    });
    it("survives the localStorage property itself throwing", () => {
      vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      expect(readCachedImage(URL1)).toBeNull();
      expect(() => cacheResolvedImage(URL1, "https://img.example.com/a.jpg")).not.toThrow();
    });
  });
});
