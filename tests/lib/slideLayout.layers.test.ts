import { describe, it, expect } from "vitest";
import { layerNames, layoutInstagramSlide, layoutTikTokCover, layoutTikTokEventSlide } from "@/lib/slideLayout";

const measureText = (t: string, s: number) => t.length * s * 0.5;
const input = { imageUrl: "https://img.example.com/a.png", imageSize: { width: 800, height: 800 }, dates: ["2026-10-19"], title: "Tech Pizza Monday", measureText };
const cover = (n: number) => layoutTikTokCover({ items: Array.from({ length: n }, (_, i) => ({ key: `k${i}`, imageUrl: `https://img.example.com/${i}.png`, imageSize: { width: 800, height: 800 } })), measureText });

describe("layerNames", () => {
  it("lists an Instagram slide's layers from back to front", () => {
    expect(layerNames(layoutInstagramSlide(input))).toEqual(["background", "event-image", "top-box", "date-and-title-box"]);
  });
  it("lists a TikTok event slide's layers, with no top box", () => {
    expect(layerNames(layoutTikTokEventSlide(input))).toEqual(["background", "event-image", "date-and-title-box"]);
  });
  it("lists the TikTok cover's layers, with one picture per event, back to front, and the top box last", () => {
    expect(layerNames(cover(3))).toEqual(["background", "picture-1", "picture-2", "picture-3", "top-box"]);
    expect(layerNames(cover(1))).toEqual(["background", "picture-1", "top-box"]);
  });
});
