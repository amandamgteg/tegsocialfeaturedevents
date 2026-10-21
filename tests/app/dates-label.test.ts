import { describe, it, expect } from "vitest";
import { datesLabel } from "@/app/design";

describe("datesLabel", () => {
  it("shows one date as before", () => {
    expect(datesLabel(["2026-10-15"])).toBe("Thu Oct 15");
  });
  it("shows consecutive days as a range", () => {
    expect(datesLabel(["2026-11-07", "2026-11-08"])).toBe("Sat Nov 7 – Sun Nov 8");
  });
  it("shows days that are not consecutive as a list", () => {
    expect(datesLabel(["2026-11-07", "2026-11-14"])).toBe("Sat Nov 7, Sat Nov 14");
  });
});
