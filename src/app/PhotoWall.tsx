"use client";
import type { EventCard } from "@/lib/types";
import { datesLabel, MONO, Star, StepBadge, TagIcon } from "./design";

export type WallItem = { card: EventCard; imageUrl: string };

const TILT = [-1.6, 1.2, -0.8, 1.6];
const proxiedUrl = (imageUrl: string) => `/api/image?url=${encodeURIComponent(imageUrl)}`;

/** "Your photo wall": every pick pinned as a picture, with the running count and the Download button (step 4). */
export function PhotoWall({ items, label, downloading, onRemove, onDownload, onMakeSocial }: { items: WallItem[]; label: string; downloading: boolean; onRemove: (card: EventCard) => void; onDownload: () => void; onMakeSocial?: () => void }) {
  const n = items.length;
  const buttonText = downloading ? "Preparing download…" : n === 0 ? "Pick an event first" : n === 1 ? "Download image" : `Download ZIP (${n} images)`;
  return (
    <aside
      aria-label="Your photo wall"
      style={{ flex: "0 0 330px", maxWidth: "100%", position: "sticky", top: 16, background: "#08181d", border: "2px solid #f5a93b", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 600 }}>
        <StepBadge n={4} size={28} /> Your photo wall
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{label}</div>
      <ul style={{ listStyle: "none", margin: 0, padding: "12px 0 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map(({ card, imageUrl }, i) => (
          <li key={card.url} style={{ position: "relative", background: "#eaf4f2", padding: "8px 8px 10px", borderRadius: 4, transform: `rotate(${TILT[i % 4]}deg)`, boxShadow: "0 8px 18px #0008" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proxiedUrl(imageUrl)} alt="" style={{ display: "block", width: "100%", aspectRatio: "16/10", objectFit: "cover" }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6 }}>
              <div style={{ flex: 1, minWidth: 0, color: "#0d2830" }}>
                <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#8a4a00" }}>{datesLabel(card.dates)}</div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>{card.title}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                  {card.tags.map((t) => (
                    <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "2px 8px 2px 6px", borderRadius: 999, background: "#cfe2df", color: "#0d2830" }}>
                      <TagIcon tag={t} size={13} stroke="#8a4a00" width={2.3} />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => onRemove(card)} aria-label={`Remove ${card.title} from your photo wall`} style={{ flex: "none", width: 44, height: 44, borderRadius: 8, border: 0, background: "transparent", color: "#0d2830", fontSize: 24 }}>
                ×
              </button>
            </div>
            <Star size={34} style={{ position: "absolute", left: "50%", top: -18, marginLeft: -17, filter: "drop-shadow(0 2px 0 #0006)" }} />
          </li>
        ))}
      </ul>
      {n === 0 && (
        <div style={{ border: "1.5px dashed #4d8185", borderRadius: 12, padding: "28px 12px", textAlign: "center", fontSize: 14, color: "#9fbfbe" }}>
          Picked events get pinned here as pictures.
        </div>
      )}
      <button
        type="button"
        aria-label="Download selected images"
        onClick={onDownload}
        disabled={n === 0 || downloading}
        style={{ minHeight: 52, borderRadius: 14, border: 0, fontSize: 18, fontWeight: 800, background: n ? "#f5a93b" : "#2d5e66", color: n ? "#1a1200" : "#9fbfbe" }}
      >
        {buttonText}
      </button>
      {onMakeSocial && (
        <button
          type="button"
          onClick={onMakeSocial}
          disabled={n === 0}
          style={{ minHeight: 48, borderRadius: 14, border: "1.5px solid #f5a93b", fontSize: 16, fontWeight: 800, background: "transparent", color: n ? "#f5a93b" : "#9fbfbe" }}
        >
          Make social images
        </button>
      )}
      <div style={{ fontSize: 12, color: "#9fbfbe", lineHeight: 1.4 }}>Files are named date_title.jpg and save to your Downloads folder.</div>
    </aside>
  );
}
