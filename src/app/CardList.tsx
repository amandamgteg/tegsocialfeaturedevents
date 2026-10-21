"use client";
import { useEffect, useState } from "react";
import type { EventCard, ImageResult } from "@/lib/types";
import { Lightbox } from "./Lightbox";
import { PasteBox, type PasteResult } from "./PasteBox";
import { selectionLabel } from "./selection";
import { datesLabel, MONO, Star, StepBadge, TagIcon } from "./design";

export type ImageState = "loading" | ImageResult;
export type ImageStates = Record<string, ImageState>;

// Only a card with a found image can be selected (decision 15).
const selectable = (s: ImageState | undefined) => !!s && s !== "loading" && s.status === "resolved";

const proxiedUrl = (imageUrl: string) => `/api/image?url=${encodeURIComponent(imageUrl)}`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function CardImage({ card, state, broken, onBroken, onOpen, onPasteImage }: { card: EventCard; state: ImageState | undefined; broken: boolean; onBroken: () => void; onOpen: () => void; onPasteImage?: (card: EventCard, link: string) => Promise<PasteResult> }) {
  if (state && state !== "loading" && state.status === "resolved" && !broken) {
    // Always through our own server, never straight from the source site (decision 16).
    return (
      <button
        type="button"
        aria-label={`View larger: ${card.title}`}
        onClick={onOpen}
        style={{ display: "block", width: "100%", padding: 0, border: 0, borderRadius: 10, overflow: "hidden", aspectRatio: "4/3", position: "relative", background: "#0d2830", cursor: "zoom-in" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={proxiedUrl(state.imageUrl)}
          alt={card.title}
          onError={onBroken}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <span aria-hidden="true" style={{ position: "absolute", right: 8, bottom: 8, width: 32, height: 32, borderRadius: "50%", background: "#0d2830cc", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eaf4f2" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l5 5M11 8v6M8 11h6" />
          </svg>
        </span>
      </button>
    );
  }
  if (state && state !== "loading") return <PasteBox card={card} onPasteImage={onPasteImage} />;
  return <div data-testid="image-placeholder" style={{ background: "#0d2830", aspectRatio: "4/3", borderRadius: 10 }} />;
}

const pickStyle = (on: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer",
  border: on ? 0 : "2px solid #f5a93b", background: on ? "#f5a93b" : "transparent", color: on ? "#1a1200" : "#f5a93b",
});

type Props = {
  cards: EventCard[];
  images?: ImageStates;
  onRetry?: () => void;
  onImageError?: (cardId: string) => void;
  selectedUrls?: ReadonlySet<string>; // card keys (see EventCard), despite the name
  hiddenSelected?: number;
  onToggleSelect?: (card: EventCard) => void;
  onPasteImage?: (card: EventCard, link: string) => Promise<PasteResult>;
  /** Buttons shown beside the count, e.g. Start over. */
  actions?: React.ReactNode;
  /** The photo wall shows the running count, so the card list need not. */
  hideSelectedLine?: boolean;
};

export function CardList({ cards, images, onRetry, onImageError, selectedUrls, hiddenSelected = 0, onToggleSelect, onPasteImage, actions, hideSelectedLine }: Props) {
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  // Once a card is no longer showing a resolved image (it failed, or is being retried), forget
  // that the browser couldn't display its old image, so a fresh result gets a fair try.
  useEffect(() => {
    setBroken((prev) => {
      const keep = [...prev].filter((id) => {
        const s = images?.[id];
        return s && s !== "loading" && s.status === "resolved";
      });
      return keep.length === prev.size ? prev : new Set(keep);
    });
  }, [images]);
  const selectedLine = selectedUrls && !hideSelectedLine ? <p>{selectionLabel(selectedUrls.size, hiddenSelected)}</p> : null;
  const pill: React.CSSProperties = { fontSize: 14, padding: "0 16px", minHeight: 44, borderRadius: 999, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" };
  const header = (count: React.ReactNode, showRetry: boolean) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <StepBadge n={3} size={28} />
        <div style={{ fontSize: 20, fontWeight: 600 }}>
          Tap <em style={{ fontStyle: "normal", color: "#f5a93b" }}>Pick</em> on the ones you want
        </div>
        {count}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {showRetry && onRetry && (
          <button type="button" onClick={onRetry} style={pill}>Retry failed images</button>
        )}
        {actions}
      </div>
    </div>
  );
  if (cards.length === 0) {
    return (
      <>
        {header(null, false)}
        {selectedLine}
        <p style={{ padding: "60px 20px", textAlign: "center", border: "1.5px dashed #6fa3a6", borderRadius: 18, fontSize: 20, color: "#cfe3e1" }}>
          No starred events in this date range.
        </p>
      </>
    );
  }

  const found = plural(cards.length, "event found", "events found");
  const loaded = images
    ? cards.filter((c) => {
        const s = images[c.id];
        return s && s !== "loading" && s.status === "resolved" && !broken.has(c.id);
      }).length
    : 0;

  const anyFailed = !!images && cards.some((c) => {
    const s = images[c.id];
    return s && s !== "loading" && s.status === "failed";
  });

  const openCard = cards.find((c) => c.id === openId);
  const openState = openCard ? images?.[openCard.id] : undefined;

  return (
    <>
      {header(
        <span style={{ fontFamily: MONO, fontSize: 13, color: "#b9d3d2" }}>{images ? `${found} · ${plural(loaded, "image loaded", "images loaded")}` : found}</span>,
        anyFailed,
      )}
      {selectedLine}
      <ul style={{ listStyle: "none", padding: "12px 0 0", margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 18 }}>
        {cards.map((c) => {
          const picked = selectedUrls?.has(c.key) ?? false;
          const canPick = !!onToggleSelect && selectable(images?.[c.id]) && !broken.has(c.id);
          return (
            <li
              key={c.id}
              style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: 16, background: "#123540", position: "relative", border: `2px solid ${picked ? "#f5a93b" : "#2d5e66"}`, boxShadow: picked ? "0 0 0 4px #f5a93b33, 0 12px 30px #0008" : "0 6px 18px #0006" }}
            >
              <div style={{ position: "relative" }}>
                <CardImage
                  card={c}
                  state={images?.[c.id]}
                  broken={broken.has(c.id)}
                  onOpen={() => setOpenId(c.id)}
                  onPasteImage={onPasteImage}
                  onBroken={() => {
                    setBroken((prev) => new Set(prev).add(c.id));
                    onImageError?.(c.id);
                  }}
                />
                <span className="sr-only">{c.dates.join(", ")}</span>
                <div aria-hidden="true" style={{ position: "absolute", left: 8, top: 8, fontFamily: MONO, fontSize: 12, fontWeight: 700, background: "#f5a93b", color: "#1a1200", padding: "4px 9px", borderRadius: 7 }}>
                  {datesLabel(c.dates).toUpperCase()}
                </div>
                {picked && canPick && <Star size={46} pop style={{ position: "absolute", right: -10, top: -16, filter: "drop-shadow(0 3px 0 #0007)" }} />}
              </div>
              <h2 style={{ fontSize: 17, lineHeight: 1.15, fontWeight: 600 }}>
                <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "#4d8185", textUnderlineOffset: 3 }}>{c.title}</a>
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {c.tags.map((t) => (
                  <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, padding: "2px 9px 2px 6px", borderRadius: 999, background: "#0d2830", border: "1px solid #4d8185", color: "#cfe3e1" }}>
                    <TagIcon tag={t} size={13} stroke="#f5a93b" width={2.2} />
                    {t}
                  </span>
                ))}
              </div>
              {canPick ? (
                <label style={pickStyle(picked)}>
                  <input type="checkbox" className="sr-only" aria-label={`Select ${c.title}`} checked={picked} onChange={() => onToggleSelect!(c)} />
                  <span aria-hidden="true">{picked ? "Picked · tap to undo" : "+ Pick"}</span>
                </label>
              ) : onToggleSelect ? (
                <button type="button" disabled style={{ minHeight: 46, borderRadius: 10, border: "1.5px dashed #4d8185", background: "transparent", color: "#8fb0b0", fontSize: 14 }}>
                  Needs an image first
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {openCard && openState && openState !== "loading" && openState.status === "resolved" && !broken.has(openCard.id) && (
        <Lightbox src={proxiedUrl(openState.imageUrl)} alt={openCard.title} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}
