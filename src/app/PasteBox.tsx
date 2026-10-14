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
    <div style={{ minHeight: 140, borderRadius: 6, background: "#f3f3f3", padding: 8, boxSizing: "border-box" }}>
      <a href={card.url} target="_blank" rel="noopener noreferrer">
        Open event page
      </a>
      {onPasteImage && (
        <form onSubmit={submit} style={{ marginTop: 8 }}>
          <input
            type="text"
            aria-label={`Paste an image link for ${card.title}`}
            placeholder="Paste an image link"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setMessage(null);
            }}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
          <button type="submit" aria-label={`Use this image for ${card.title}`} disabled={busy} style={{ marginTop: 4 }}>
            {busy ? "Checking…" : "Use this image"}
          </button>
          {message && (
            <p role="alert" style={{ color: "#b00020", margin: "4px 0 0", fontSize: 13 }}>
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
