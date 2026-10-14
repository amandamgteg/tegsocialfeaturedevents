"use client";
import { useEffect, useRef, useState } from "react";
import { buildCards, defaultWindow } from "@/lib/window";
import type { EventCard, FeedEvent, ImageResult } from "@/lib/types";
import { CardList, type ImageStates } from "./CardList";
import { runLookups } from "./lookupRunner";

async function findImage(card: EventCard): Promise<ImageResult> {
  const res = await fetch("/api/find-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(card),
  });
  if (!res.ok) throw new Error(`lookup failed (${res.status})`);
  return (await res.json()) as ImageResult;
}

export function EventsApp() {
  const [cards, setCards] = useState<EventCard[] | null>(null);
  const [images, setImages] = useState<ImageStates>({});
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React dev mode runs effects twice; look each image up once
    started.current = true;
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((feed: FeedEvent[]) => {
        const built = buildCards(feed, defaultWindow(new Date()));
        setCards(built);
        setImages(Object.fromEntries(built.map((c) => [c.id, "loading" as const])));
        void runLookups(built, findImage, (id, result) => setImages((prev) => ({ ...prev, [id]: result })));
      })
      .catch(() => setError("Couldn't load events. Please refresh and try again."));
  }, []);

  if (error) return <p>{error}</p>;
  if (!cards) return <p>Loading events…</p>;
  return <CardList cards={cards} images={images} />;
}
