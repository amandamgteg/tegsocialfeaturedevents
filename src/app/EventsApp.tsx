"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildCards, clampWindow, defaultWindow, filterByTags, tagOptions } from "@/lib/window";
import type { DateWindow, EventCard, FeedEvent, ImageResult } from "@/lib/types";
import { CardList, type ImageStates } from "./CardList";
import { DateRangePicker, TagStep } from "./Filters";
import { PhotoWall, type WallItem } from "./PhotoWall";
import type { PasteResult } from "./PasteBox";
import { forgetCachedImage, readCachedImage } from "./imageCache";
import { lookupCards, retryFailed } from "./lookups";
import { downloadSelected, PartialDownloadError } from "@/lib/download";
import { clearPicks, loadPicks, restorePicks, savePicks } from "./picks";
import { hiddenSelectedCount, selectedDownloadItems, selectionLabel, toggleSelected } from "./selection";

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
  const [stored] = useState(() => loadPicks()); // what was saved in this browser last time
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(stored.selected));
  const [pasted, setPasted] = useState<Record<string, string>>(stored.pasted); // event url -> pasted image link
  // Image state is kept by event URL, because a card's id can change when the window changes.
  const [imagesByUrl, setImagesByUrl] = useState<ImageStates>(() =>
    Object.fromEntries(Object.entries(stored.pasted).map(([url, imageUrl]) => [url, { status: "resolved" as const, imageUrl }])),
  );
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);
  const requested = useRef(new Set(Object.keys(stored.pasted))); // urls already looked up, or pasted (no lookup needed)
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
      .then((data: FeedEvent[]) => {
        // Every starred event is known by url, so a pick outside the window can still be named and downloaded.
        for (const e of [...data].sort((a, b) => b.date.localeCompare(a.date))) {
          if (e.starred) knownCards.current.set(e.url, { id: e.id, title: e.title, url: e.url, date: e.date, tags: e.tags });
        }
        const restored = restorePicks(stored, data, buildCards(data, window), readCachedImage);
        setSelected(restored.selected);
        setPasted(restored.pasted);
        setImagesByUrl((prev) => {
          const next = { ...prev };
          for (const url of restored.selected) {
            const image = restored.pasted[url] ?? readCachedImage(url);
            if (!next[url] && image) next[url] = { status: "resolved", imageUrl: image };
          }
          return next;
        });
        setFeed(data);
      })
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

  // Remember picks and pasted images in this browser (decision 10).
  useEffect(() => {
    savePicks({ selected: [...selected], pasted });
  }, [selected, pasted]);

  const startOver = () => {
    const pastedUrls = Object.keys(pasted);
    setSelected(new Set());
    setPasted({});
    clearPicks();
    // A card that was fixed by a pasted image goes back to having no image. Found images stay cached.
    setImagesByUrl((prev) => ({ ...prev, ...Object.fromEntries(pastedUrls.map((u) => [u, { status: "failed" as const, reason: "pasted image removed" }])) }));
  };

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
    setPasted(({ [card.url]: _gone, ...rest }) => rest);
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
      setPasted((prev) => ({ ...prev, [card.url]: result.imageUrl }));
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

  const wallItems: WallItem[] = [...selected]
    .flatMap((url) => {
      const card = knownCards.current.get(url);
      const state = imagesByUrl[url];
      return card && state && state !== "loading" && state.status === "resolved" ? [{ card, imageUrl: state.imageUrl }] : [];
    })
    .sort((a, b) => a.card.date.localeCompare(b.card.date) || a.card.title.localeCompare(b.card.title));

  const note = { color: "#cfe3e1", padding: 24 } as const;
  if (error) return <p style={note}>{error}</p>;
  if (!feed) return <p style={note}>Loading events…</p>;
  return (
    <div style={{ maxWidth: 1312, margin: "0 auto", padding: "28px 24px 60px", display: "flex", flexDirection: "column", gap: 22 }}>
      <section style={{ background: "#123540", border: "1.5px dashed #6fa3a6", borderRadius: 18, padding: "20px 24px", display: "flex", flexWrap: "wrap", gap: "24px 36px", alignItems: "center" }}>
        <DateRangePicker window={window} today={today} onChange={changeWindow} />
        <TagStep options={options} selected={tags} onChange={setPickedTags} />
      </section>
      {downloadError && <p role="alert" style={{ color: "#ffb4a0" }}>{downloadError}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 560px", minWidth: 0 }}>
          <CardList
            cards={visible}
            images={imagesFor(visible)}
            onRetry={retry}
            onImageError={imageBroken}
            selectedUrls={selected}
            hiddenSelected={hiddenSelectedCount(selected, visible)}
            hideSelectedLine
            onPasteImage={pasteImage}
            onToggleSelect={(card) => setSelected((prev) => toggleSelected(prev, card.url))}
            actions={
              <button
                type="button"
                onClick={startOver}
                disabled={selected.size === 0 && Object.keys(pasted).length === 0}
                style={{ fontSize: 14, padding: "0 16px", minHeight: 44, borderRadius: 999, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}
              >
                Start over
              </button>
            }
          />
        </div>
        <PhotoWall
          items={wallItems}
          label={selectionLabel(selected.size, hiddenSelectedCount(selected, visible))}
          downloading={downloading}
          onRemove={(card) => setSelected((prev) => toggleSelected(prev, card.url))}
          onDownload={download}
        />
      </div>
    </div>
  );
}
