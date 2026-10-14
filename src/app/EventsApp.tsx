"use client";
import { useEffect, useState } from "react";
import { buildCards, defaultWindow } from "@/lib/window";
import type { EventCard, FeedEvent } from "@/lib/types";
import { CardList } from "./CardList";

export function EventsApp() {
  const [cards, setCards] = useState<EventCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((feed: FeedEvent[]) => setCards(buildCards(feed, defaultWindow(new Date()))))
      .catch(() => setError("Couldn't load events. Please refresh and try again."));
  }, []);

  if (error) return <p>{error}</p>;
  if (!cards) return <p>Loading events…</p>;
  return <CardList cards={cards} />;
}
