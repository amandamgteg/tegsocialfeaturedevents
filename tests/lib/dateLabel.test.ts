import { describe, it, expect } from "vitest";
import { formatDateLabel } from "@/lib/dateLabel";

describe("formatDateLabel", () => {
  it("gives one date as month and day, with no st or th", () => {
    expect(formatDateLabel(["2026-10-21"])).toBe("Oct 21");
    expect(formatDateLabel(["2026-10-01"])).toBe("Oct 1");
    expect(formatDateLabel(["2026-10-22"])).toBe("Oct 22");
  });

  it("uses Amanda's month names, in title case", () => {
    const names = ["Jan", "Feb", "March", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
    names.forEach((name, i) => {
      const month = String(i + 1).padStart(2, "0");
      expect(formatDateLabel([`2026-${month}-05`])).toBe(`${name} 5`);
    });
  });

  it("gives consecutive days as a range", () => {
    expect(formatDateLabel(["2026-07-01", "2026-07-02", "2026-07-03"])).toBe("July 1-3");
    expect(formatDateLabel(["2026-11-07", "2026-11-08"])).toBe("Nov 7-8");
  });

  it("gives a range across a month change with both months", () => {
    expect(formatDateLabel(["2026-06-30", "2026-07-01", "2026-07-02"])).toBe("June 30-July 2");
  });

  it("treats a run across New Year as consecutive", () => {
    expect(formatDateLabel(["2026-12-31", "2027-01-01"])).toBe("Dec 31-Jan 1");
  });

  it("gives other dates as a list", () => {
    expect(formatDateLabel(["2026-07-01", "2026-07-04", "2026-07-06"])).toBe("July 1, 4, 6");
    expect(formatDateLabel(["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-10"])).toBe("July 1, 2, 3, 10");
  });

  it("names the month again in a list when the month changes", () => {
    expect(formatDateLabel(["2026-06-30", "2026-07-02"])).toBe("June 30, July 2");
  });

  it("puts dates in order and ignores repeats", () => {
    expect(formatDateLabel(["2026-07-03", "2026-07-01", "2026-07-02", "2026-07-02"])).toBe("July 1-3");
  });
});
