// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateRangePicker, TagFilter } from "@/app/Filters";

const TODAY = new Date(2026, 9, 14);

describe("DateRangePicker", () => {
  it("shows two date inputs with the window's values", () => {
    render(<DateRangePicker window={{ start: "2026-10-14", end: "2026-10-28" }} today={TODAY} onChange={() => {}} />);
    expect((screen.getByLabelText("From") as HTMLInputElement).value).toBe("2026-10-14");
    expect((screen.getByLabelText("To") as HTMLInputElement).value).toBe("2026-10-28");
  });
  it("limits both pickers to today+30 on the calendar", () => {
    render(<DateRangePicker window={{ start: "2026-10-14", end: "2026-10-28" }} today={TODAY} onChange={() => {}} />);
    expect(screen.getByLabelText("To")).toHaveAttribute("max", "2026-11-13");
    expect(screen.getByLabelText("From")).toHaveAttribute("max", "2026-11-13");
  });
  it("reports a changed end date, clamped to today+30", () => {
    const onChange = vi.fn();
    render(<DateRangePicker window={{ start: "2026-10-14", end: "2026-10-28" }} today={TODAY} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-12-25" } });
    expect(onChange).toHaveBeenCalledWith({ start: "2026-10-14", end: "2026-11-13" });
  });
  it("reports a changed start date, and moves the end up if it would be before the start", () => {
    const onChange = vi.fn();
    render(<DateRangePicker window={{ start: "2026-10-14", end: "2026-10-28" }} today={TODAY} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-01" } });
    expect(onChange).toHaveBeenCalledWith({ start: "2026-11-01", end: "2026-11-01" });
  });
  it("ignores a cleared or half-typed date", () => {
    const onChange = vi.fn();
    render(<DateRangePicker window={{ start: "2026-10-14", end: "2026-10-28" }} today={TODAY} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "" } });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("TagFilter", () => {
  it("shows one toggle per option, none pressed by default", () => {
    render(<TagFilter options={["art", "games"]} selected={[]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "art" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "games" })).toHaveAttribute("aria-pressed", "false");
  });
  it("shows selected tags as pressed", () => {
    render(<TagFilter options={["art", "games"]} selected={["games"]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "games" })).toHaveAttribute("aria-pressed", "true");
  });
  it("adds a tag when an unpressed one is clicked, and removes it when a pressed one is clicked", () => {
    const onChange = vi.fn();
    const { rerender } = render(<TagFilter options={["art", "games"]} selected={["art"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "games" }));
    expect(onChange).toHaveBeenLastCalledWith(["art", "games"]);
    rerender(<TagFilter options={["art", "games"]} selected={["art", "games"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "art" }));
    expect(onChange).toHaveBeenLastCalledWith(["games"]);
  });
  it("renders nothing when there are no options", () => {
    const { container } = render(<TagFilter options={[]} selected={[]} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
