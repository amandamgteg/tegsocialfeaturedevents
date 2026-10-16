"use client";
import { useEffect } from "react";

/** A larger view of one image. Closes with the button, the Escape key, or a click outside the image. */
export function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      data-testid="lightbox-backdrop"
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#040e11e6", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50 }}
    >
      <div style={{ width: "min(760px, 100%)", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 16, background: "#123540" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{alt}</div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            style={{ minHeight: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#f5a93b", color: "#1a1200", fontWeight: 800, fontSize: 16 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
