"use client";
import { useState } from "react";
import type { EventCard } from "@/lib/types";

export type PasteResult = { ok: true } | { ok: false; reason: string };

/** The event link plus a box to paste an image link, for a card with no image (decision 15). */
export function PasteBox({ card, onPasteImage }: { card: EventCard; onPasteImage?: (card: EventCard, link: string) => Promise<PasteResult> }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onPasteImage || busy || !value.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await onPasteImage(card, value.trim());
      if (!result.ok) setMessage(result.reason); // card stays as it was; the text stays too
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ aspectRatio: "4/3", borderRadius: 10, background: "repeating-linear-gradient(45deg,#0d2830 0 12px,#123540 12px 24px)", border: "1.5px dashed #6fa3a6", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", justifyContent: "center", padding: 10, textAlign: "center", overflow: "auto" }}
    >
      <div style={{ fontWeight: 600, fontSize: 15 }}>No image found yet</div>
      <a href={card.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
        Open the event page ↗
      </a>
      {onPasteImage && (
        <form onSubmit={submit} style={{ display: "flex", gap: 6, width: "100%" }}>
          <input
            type="text"
            aria-label={`Paste an image link for ${card.title}`}
            placeholder="Paste image link"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setMessage(null);
            }}
            style={{ flex: 1, minWidth: 0, font: "inherit", fontSize: 14, padding: "0 8px", minHeight: 44, borderRadius: 10, border: "1.5px solid #6fa3a6", background: "#0d2830", color: "#eaf4f2" }}
          />
          <button
            type="submit"
            aria-label={`Use this image for ${card.title}`}
            disabled={busy}
            style={{ padding: "0 10px", minHeight: 44, borderRadius: 10, border: 0, background: "#7fe0ea", color: "#04242a", fontWeight: 700, fontSize: 14 }}
          >
            {busy ? "Checking…" : "Use it"}
          </button>
        </form>
      )}
      {message && (
        <p role="alert" style={{ color: "#ffb4a0", fontSize: 12 }}>
          {message}
        </p>
      )}
    </div>
  );
}
