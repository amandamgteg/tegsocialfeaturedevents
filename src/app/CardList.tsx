import type { EventCard } from "@/lib/types";

export function CardList({ cards }: { cards: EventCard[] }) {
  if (cards.length === 0) return <p>No starred events in this date range.</p>;
  return (
    <>
      <p>{cards.length === 1 ? "1 event found" : `${cards.length} events found`}</p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <li key={c.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div data-testid="image-placeholder" style={{ background: "#e5e5e5", height: 140, borderRadius: 6 }} />
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
