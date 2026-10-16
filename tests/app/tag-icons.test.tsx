// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TagIcon } from "@/app/design";

const path = (tag: string) => render(<TagIcon tag={tag} size={20} stroke="#fff" width={2} />).container.querySelector("path")!.getAttribute("d");
const dot = path("some-tag-with-no-icon");

describe("Tag icons", () => {
  it.each(["games", "intimacy", "nerdy", "outdoors", "talky"])("gives %s its own icon, not the plain dot", (tag) => {
    expect(path(tag)).not.toBe(dot);
  });
  it("matches tags whatever their capital letters", () => {
    expect(path("Games")).toBe(path("games"));
  });
  it("gives each of the five a different icon", () => {
    const all = ["games", "intimacy", "nerdy", "outdoors", "talky"].map(path);
    expect(new Set(all).size).toBe(5);
  });
  it("still gives the original eight their icons", () => {
    for (const t of ["learning", "music", "nightlife", "talks", "community", "making", "art", "food"]) expect(path(t)).not.toBe(dot);
  });
});
