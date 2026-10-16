"use client";
import { clampWindow } from "@/lib/window";
import type { DateWindow } from "@/lib/types";
import { StepBadge, TagIcon } from "./design";

const pad = (n: number) => String(n).padStart(2, "0");
const maxDate = (today: Date) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const dateInputStyle: React.CSSProperties = { font: "inherit", fontSize: 16, padding: "0 10px", borderRadius: 10, border: "1.5px solid #6fa3a6", background: "#0d2830", color: "#eaf4f2", colorScheme: "dark", minHeight: 44 };
const dateLabelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "#b9d3d2" };
const stepTitle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 600 };

export function DateRangePicker({ window, today, onChange }: { window: DateWindow; today: Date; onChange: (w: DateWindow) => void }) {
  const max = maxDate(today);
  const change = (field: "start" | "end") => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return; // cleared or half-typed: keep the current window
    onChange(clampWindow({ ...window, [field]: e.target.value }, today));
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={stepTitle}>
        <StepBadge n={1} size={30} /> When?
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <label style={dateLabelStyle}>
          From <input type="date" value={window.start} max={max} onChange={change("start")} style={dateInputStyle} />
        </label>
        <label style={dateLabelStyle}>
          To <input type="date" value={window.end} max={max} onChange={change("end")} style={dateInputStyle} />
        </label>
      </div>
    </div>
  );
}

/** The "What kind?" step. The tag buttons are TagFilter, which shows nothing when there are no tags. */
export function TagStep({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (tags: string[]) => void }) {
  return (
    <div style={{ flex: "1 1 440px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={stepTitle}>
        <StepBadge n={2} size={30} /> What kind? <span style={{ fontSize: 14, fontWeight: 400, color: "#9fbfbe" }}>optional · pick any</span>
      </div>
      <TagFilter options={options} selected={selected} onChange={onChange} />
      {options.length === 0 && <div style={{ fontSize: 14, color: "#9fbfbe" }}>No events in these dates, so no tags.</div>}
    </div>
  );
}

export function TagFilter({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (tags: string[]) => void }) {
  if (options.length === 0) return null;
  return (
    <div role="group" aria-label="Filter by tag" style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {options.map((tag) => {
        const on = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((t) => t !== tag) : [...selected, tag])}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 86, minHeight: 70, padding: "8px 12px", borderRadius: 14, border: "2px solid #f5a93b", background: on ? "#f5a93b" : "transparent", color: on ? "#1a1200" : "#f5a93b" }}
          >
            <TagIcon tag={tag} size={26} stroke="currentColor" width={2} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>{tag}</span>
          </button>
        );
      })}
    </div>
  );
}
