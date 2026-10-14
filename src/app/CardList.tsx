"use client";
import { useState } from "react";
import type { EventCard, ImageResult } from "@/lib/types";

export type ImageState = "loading" | ImageResult;
export type ImageStates = Record<string, ImageState>;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function CardImage({ card, state, broken, onBroken }: { card: EventCard; state: ImageState | undefined; broken: boolean; onBroken: () => void }) {
  if (state && state !== "loading" && state.status === "resolved" && !broken) {
    // Always through our own server, never straight from the source site (decision 16).
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/image?url=${encodeURIComponent(state.imageUrl)}`}
        alt={card.title}
        onError={onBroken}
        style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6, display: "block" }}
      />
    );
  }
  if (state && state !== "loading") {
    return (
      <div style={{ height: 140, borderRadius: 6, background: "#f3f3f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <a href={card.url} target="_blank" rel="noopener noreferrer">
          Open event page
        </a>
      </div>
    );
  }
  return <div data-testid="image-placeholder" style={{ background: "#e5e5e5", height: 140, borderRadius: 6 }} />;
}

export function CardList({ cards, images }: { cards: EventCard[]; images?: ImageStates }) {
  const [broken, setBroken] = useState<Set<string>>(new Set());
  if (cards.length === 0) return <p>No starred events in this date range.</p>;

  const found = plural(cards.length, "event found", "events found");
  const loaded = images
    ? cards.filter((c) => {
        const s = images[c.id];
        return s && s !== "loading" && s.status === "resolved" && !broken.has(c.id);
      }).length
    : 0;

  return (
    <>
      <p>{images ? `${found} · ${plural(loaded, "image loaded", "images loaded")}` : found}</p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <li key={c.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <CardImage
              card={c}
              state={images?.[c.id]}
              broken={broken.has(c.id)}
              onBroken={() => setBroken((prev) => new Set(prev).add(c.id))}
            />
            <p style={{ margin: "8px 0 0", color: "#555" }}>{c.date}</p>
            <h2 style={{ fontSize: 16, margin: "4px 0" }}>{c.title}</h2>
            <p style={{ margin: 0 }}>
              {c.tags.map((t) => (
                <span key={t} style={{ marginRight: 6, fontSize: 12, background: "#eee", padding: "2px 6px", borderRadius: 4 }}>{t}</span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
