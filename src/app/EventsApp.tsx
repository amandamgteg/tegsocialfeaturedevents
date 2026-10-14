"use client";
import { useEffect, useRef, useState } from "react";
import { buildCards, defaultWindow } from "@/lib/window";
import type { EventCard, FeedEvent, ImageResult } from "@/lib/types";
import { CardList, type ImageStates } from "./CardList";
import { forgetCachedImage } from "./imageCache";
import { lookupCards, retryFailed } from "./lookups";

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
  const imagesRef = useRef<ImageStates>({});
  imagesRef.current = images;

  const record = (id: string, result: ImageResult) => setImages((prev) => ({ ...prev, [id]: result }));

  const retry = () => {
    if (!cards) return;
    const current = imagesRef.current;
    const failed = cards.filter((c) => {
      const s = current[c.id];
      return s && s !== "loading" && s.status === "failed";
    });
    setImages((prev) => ({ ...prev, ...Object.fromEntries(failed.map((c) => [c.id, "loading" as const])) }));
    void retryFailed(cards, current, findImage, record);
  };

  // The browser could not display this image (stale or blocked), so treat it as failed and forget it.
  const imageBroken = (id: string) => {
    const card = cards?.find((c) => c.id === id);
    if (card) forgetCachedImage(card.url);
    record(id, { status: "failed", reason: "the image could not be displayed" });
  };

  useEffect(() => {
    if (started.current) return; // React dev mode runs effects twice; look each image up once
    started.current = true;
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((feed: FeedEvent[]) => {
        const built = buildCards(feed, defaultWindow(new Date()));
        setCards(built);
        setImages(Object.fromEntries(built.map((c) => [c.id, "loading" as const])));
        void lookupCards(built, findImage, record);
      })
      .catch(() => setError("Couldn't load events. Please refresh and try again."));
  }, []);

  if (error) return <p>{error}</p>;
  if (!cards) return <p>Loading events…</p>;
  return <CardList cards={cards} images={images} onRetry={retry} onImageError={imageBroken} />;
}
