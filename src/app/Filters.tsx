"use client";
import { clampWindow } from "@/lib/window";
import type { DateWindow } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
const maxDate = (today: Date) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function DateRangePicker({ window, today, onChange }: { window: DateWindow; today: Date; onChange: (w: DateWindow) => void }) {
  const max = maxDate(today);
  const change = (field: "start" | "end") => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return; // cleared or half-typed: keep the current window
    onChange(clampWindow({ ...window, [field]: e.target.value }, today));
  };
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", margin: "12px 0" }}>
      <label>
        From <input type="date" value={window.start} max={max} onChange={change("start")} />
      </label>
      <label>
        To <input type="date" value={window.end} max={max} onChange={change("end")} />
      </label>
    </div>
  );
}

export function TagFilter({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (tags: string[]) => void }) {
  if (options.length === 0) return null;
  return (
    <div role="group" aria-label="Filter by tag" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
      {options.map((tag) => {
        const on = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((t) => t !== tag) : [...selected, tag])}
            style={{ padding: "4px 10px", borderRadius: 14, border: "1px solid #999", background: on ? "#222" : "#fff", color: on ? "#fff" : "#222", cursor: "pointer" }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
