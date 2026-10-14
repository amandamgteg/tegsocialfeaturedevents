"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildCards, clampWindow, defaultWindow, filterByTags, tagOptions } from "@/lib/window";
import type { DateWindow, EventCard, FeedEvent, ImageResult } from "@/lib/types";
import { CardList, type ImageStates } from "./CardList";
import { DateRangePicker, TagFilter } from "./Filters";
import type { PasteResult } from "./PasteBox";
import { forgetCachedImage } from "./imageCache";
import { lookupCards, retryFailed } from "./lookups";
import { downloadSelected, PartialDownloadError } from "@/lib/download";
import { hiddenSelectedCount, selectedDownloadItems, toggleSelected } from "./selection";

async function findImage(card: EventCard): Promise<ImageResult> {
  const res = await fetch("/api/find-image", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(card),
  });
  if (!res.ok) throw new Error(`lookup failed (${res.status})`);
  return (await res.json()) as ImageResult;
}

const isFailed = (s: ImageStates[string] | undefined) => !!s && s !== "loading" && s.status === "failed";

export function EventsApp() {
  const [today] = useState(() => new Date()); // the browser's date (decision 5)
  const [feed, setFeed] = useState<FeedEvent[] | null>(null);
  const [window, setWindow] = useState<DateWindow>(() => defaultWindow(today));
  const [pickedTags, setPickedTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // Image state is kept by event URL, because a card's id can change when the window changes.
  const [imagesByUrl, setImagesByUrl] = useState<ImageStates>({});
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);
  const requested = useRef(new Set<string>()); // urls already looked up (or being looked up)
  const knownCards = useRef(new Map<string, EventCard>()); // every card seen, so selections outside the window can still be downloaded
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const windowCards = useMemo(() => (feed ? buildCards(feed, window) : []), [feed, window]);
  windowCards.forEach((c) => knownCards.current.set(c.url, c));
  const options = useMemo(() => tagOptions(windowCards), [windowCards]);
  const tags = pickedTags.filter((t) => options.includes(t));
  const visible = useMemo(() => filterByTags(windowCards, tags), [windowCards, tags.join("\n")]); // eslint-disable-line react-hooks/exhaustive-deps

  const imagesFor = (cards: EventCard[]): ImageStates =>
    Object.fromEntries(cards.flatMap((c) => (imagesByUrl[c.url] ? [[c.id, imagesByUrl[c.url]]] : [])));

  const recorder = (cards: EventCard[]) => {
    const urlOf = new Map(cards.map((c) => [c.id, c.url]));
    return (id: string, result: ImageResult) => setImagesByUrl((prev) => ({ ...prev, [urlOf.get(id)!]: result }));
  };

  useEffect(() => {
    if (fetched.current) return; // React dev mode runs effects twice
    fetched.current = true;
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((data: FeedEvent[]) => setFeed(data))
      .catch(() => setError("Couldn't load events. Please refresh and try again."));
  }, []);

  // Every starred event in the window gets a lookup, not only her picks (decision 14). Each url once.
  useEffect(() => {
    const fresh = windowCards.filter((c) => !requested.current.has(c.url));
    if (fresh.length === 0) return;
    fresh.forEach((c) => requested.current.add(c.url));
    setImagesByUrl((prev) => ({ ...Object.fromEntries(fresh.map((c) => [c.url, "loading" as const])), ...prev }));
    void lookupCards(fresh, findImage, recorder(fresh));
  }, [windowCards]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the picked tags to the ones still on offer, so a stale pick can't come back later.
  useEffect(() => {
    setPickedTags((prev) => (prev.every((t) => options.includes(t)) ? prev : prev.filter((t) => options.includes(t))));
  }, [options]);

  // A selected card that can no longer be downloaded is deselected.
  useEffect(() => {
    setSelected((prev) => {
      const keep = [...prev].filter((url) => !isFailed(imagesByUrl[url]));
      return keep.length === prev.size ? prev : new Set(keep);
    });
  }, [imagesByUrl]);

  const retry = () => {
    const failed = visible.filter((c) => isFailed(imagesByUrl[c.url]));
    setImagesByUrl((prev) => ({ ...prev, ...Object.fromEntries(failed.map((c) => [c.url, "loading" as const])) }));
    void retryFailed(visible, imagesFor(visible), findImage, recorder(visible));
  };

  // The browser could not display this image (stale or blocked): treat it as failed and forget it.
  const imageBroken = (id: string) => {
    const card = windowCards.find((c) => c.id === id);
    if (!card) return;
    forgetCachedImage(card.url);
    setImagesByUrl((prev) => ({ ...prev, [card.url]: { status: "failed", reason: "the image could not be displayed" } }));
  };

  // A pasted link is checked by the server first. A refusal changes nothing (decision 15).
  const pasteImage = async (card: EventCard, link: string): Promise<PasteResult> => {
    try {
      const res = await fetch("/api/check-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: link }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const result = (await res.json()) as { ok: true; imageUrl: string } | { ok: false; reason: string };
      if (!result.ok) return { ok: false, reason: result.reason };
      setImagesByUrl((prev) => ({ ...prev, [card.url]: { status: "resolved", imageUrl: result.imageUrl } }));
      return { ok: true };
    } catch {
      return { ok: false, reason: "Couldn't check that link. Please try again." };
    }
  };

  const download = async () => {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadSelected(selectedDownloadItems(selected, knownCards.current, imagesByUrl));
    } catch (err) {
      setDownloadError(err instanceof PartialDownloadError ? err.message : "Couldn't download the images. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const changeWindow = (w: DateWindow) => setWindow(clampWindow(w, today));

  if (error) return <p>{error}</p>;
  if (!feed) return <p>Loading events…</p>;
  return (
    <>
      <DateRangePicker window={window} today={today} onChange={changeWindow} />
      <TagFilter options={options} selected={tags} onChange={setPickedTags} />
      <p>
        <button type="button" onClick={download} disabled={selected.size === 0 || downloading}>
          {downloading ? "Preparing download…" : "Download selected images"}
        </button>
      </p>
      {downloadError && <p role="alert" style={{ color: "#b00020" }}>{downloadError}</p>}
      <CardList
        cards={visible}
        images={imagesFor(visible)}
        onRetry={retry}
        onImageError={imageBroken}
        selectedUrls={selected}
        hiddenSelected={hiddenSelectedCount(selected, visible)}
        onPasteImage={pasteImage}
        onToggleSelect={(card) => setSelected((prev) => toggleSelected(prev, card.url))}
      />
    </>
  );
}
