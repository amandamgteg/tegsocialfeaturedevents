"use client";
import { useState } from "react";
import type { EventCard } from "@/lib/types";
import type { PasteResult } from "./PasteBox";

const linkButton: React.CSSProperties = { background: "transparent", border: 0, padding: "0 4px", minHeight: 44, color: "#7fe0ea", fontSize: 13, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" };

/**
 * For a card that already has an image: "Use a different image" opens a box to paste an image link (decision 15),
 * and "Use the original image" goes back to the one the tool found.
 */
export function ReplaceImage({ card, replaced, onPasteImage, onRestoreOriginal }: { card: EventCard; replaced: boolean; onPasteImage: (card: EventCard, link: string) => Promise<PasteResult>; onRestoreOriginal?: (card: EventCard) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setValue("");
    setMessage(null);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !value.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await onPasteImage(card, value.trim());
      if (result.ok) close();
      else setMessage(result.reason); // the current image stays; the text stays too
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 10px" }}>
        {!open && (
          <button type="button" aria-label={`Use a different image for ${card.title}`} onClick={() => setOpen(true)} style={linkButton}>
            Use a different image
          </button>
        )}
        {replaced && onRestoreOriginal && (
          <button type="button" aria-label={`Use the original image for ${card.title}`} onClick={() => onRestoreOriginal(card)} style={linkButton}>
            Use the original image
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input
            type="text"
            aria-label={`Paste an image link for ${card.title}`}
            placeholder="Paste image link"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setMessage(null);
            }}
            style={{ flex: "1 1 100%", minWidth: 0, font: "inherit", fontSize: 14, padding: "0 8px", minHeight: 44, borderRadius: 10, border: "1.5px solid #6fa3a6", background: "#0d2830", color: "#eaf4f2" }}
          />
          <button type="submit" aria-label={`Use this image for ${card.title}`} disabled={busy} style={{ padding: "0 12px", minHeight: 44, borderRadius: 10, border: 0, background: "#7fe0ea", color: "#04242a", fontWeight: 700, fontSize: 14 }}>
            {busy ? "Checking…" : "Use it"}
          </button>
          <button type="button" onClick={close} style={{ padding: "0 12px", minHeight: 44, borderRadius: 10, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2", fontSize: 14 }}>
            Cancel
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
