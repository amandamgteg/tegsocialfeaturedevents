"use client";
import { useEffect, useMemo, useState } from "react";
import { PartialDownloadError } from "@/lib/download";
import { layoutInstagramSlide, layoutTikTokCover, layoutTikTokEventSlide, type AnyLayout, type DrawableLayout, type SlideEdits, type TikTokCoverLayout } from "@/lib/slideLayout";
import { loadEdits, resetAll, resetSlide, saveEdits } from "@/lib/slideEdits";
import { downloadFinished, downloadLayers } from "@/lib/socialZip";
import { canvasTextMeasurer, measureImage } from "./slideSupport";
import type { WallItem } from "./PhotoWall";
import { CoverEditPanel } from "./CoverEditPanel";
import { SlideEditPanel } from "./SlideEditPanel";
import { SlidePreview } from "./SlidePreview";
import { slideWarning } from "./slideWarning";

type Size = { width: number; height: number };
type Platform = "Instagram" | "TikTok";
const PLATFORMS: Platform[] = ["Instagram", "TikTok"];
/** Where a slide's edits are kept. Instagram keeps the plain card key. TikTok edits are stored apart from them. */
const editKey = (platform: Platform, item: WallItem) => (platform === "TikTok" ? `tiktok|${item.card.key}` : item.card.key);
const slideId = (platform: Platform, item: WallItem) => `${platform}|${item.card.key}`;
/** The TikTok cover is one slide for all the picked events, so it has its own place to keep edits and its own id. */
const COVER_KEY = "tiktok|cover";
const COVER_ID = "TikTok|cover";

const button = { minHeight: 44, borderRadius: 999, padding: "0 18px", fontSize: 15, fontWeight: 700 } as const;

/** "Make social images": a preview of every picked event as a finished Instagram slide and a TikTok slide (SPEC section 3, step 11). */
export function SocialEditor({
  items,
  onClose,
  onDownloadOriginals,
  downloadingOriginals,
}: {
  items: WallItem[];
  onClose: () => void;
  onDownloadOriginals: () => void;
  downloadingOriginals: boolean;
}) {
  const [sizes, setSizes] = useState<Record<string, Size | "error">>({});
  const [edits, setEdits] = useState<Record<string, SlideEdits>>(() => ({ [COVER_KEY]: loadEdits(COVER_KEY), ...Object.fromEntries(items.flatMap((i) => PLATFORMS.map((p) => [editKey(p, i), loadEdits(editKey(p, i))]))) }));
  const [platform, setPlatform] = useState<Platform>("Instagram");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [drawErrors, setDrawErrors] = useState<Record<string, true>>({});
  const [busy, setBusy] = useState(false);
  const [busyLayers, setBusyLayers] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const measureText = useMemo(() => canvasTextMeasurer(), []);
  // `items` is a new array on every render of the page, so the effect watches what is actually in it.
  const signature = items.map((i) => `${i.card.key}|${i.imageUrl}|${i.card.dates.join()}|${i.card.title}`).join("\n");

  useEffect(() => {
    let cancelled = false;
    setSizes({});
    setDrawErrors({});
    items.forEach(async (item) => {
      let size: Size | "error";
      try {
        size = await measureImage(item.imageUrl);
      } catch {
        size = "error";
      }
      if (!cancelled) setSizes((prev) => ({ ...prev, [item.card.key]: size }));
    });
    return () => {
      cancelled = true;
    };
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const slides = items.flatMap((item) =>
    PLATFORMS.map((plat) => {
      const key = item.card.key;
      const size = sizes[key];
      let layout: AnyLayout | undefined;
      if (size && size !== "error") {
        const input = { imageUrl: item.imageUrl, imageSize: size, dates: item.card.dates, title: item.card.title, measureText };
        const slideEdits = edits[editKey(plat, item)];
        layout = plat === "TikTok" ? layoutTikTokEventSlide(input, slideEdits) : layoutInstagramSlide(input, slideEdits);
      }
      return { id: slideId(plat, item), platform: plat, item, size: size && size !== "error" ? size : undefined, layout, error: size === "error" || drawErrors[slideId(plat, item)] };
    }),
  );
  // The TikTok cover collages every picked event. It waits until every picture has been measured.
  const lastDate = items.flatMap((i) => i.card.dates).sort().at(-1) ?? "";
  const firstDate = items.map((i) => i.card.date).sort()[0] ?? "";
  const coverItems = items.flatMap((item) => (sizes[item.card.key] && sizes[item.card.key] !== "error" ? [{ item, size: sizes[item.card.key] as Size }] : []));
  const allMeasured = items.every((i) => sizes[i.card.key]);
  const coverLayout: TikTokCoverLayout | undefined =
    allMeasured && coverItems.length > 0
      ? layoutTikTokCover({ items: coverItems.map(({ item, size }) => ({ key: item.card.key, imageUrl: item.imageUrl, imageSize: size })), measureText }, edits[COVER_KEY])
      : undefined;
  const cover = { id: COVER_ID, layout: coverLayout, error: (allMeasured && coverItems.length === 0) || drawErrors[COVER_ID] };

  // Instagram slides first, then the TikTok cover and event slides: the order of the finished-images ZIP.
  const ready = [
    ...slides.filter((s) => s.platform === "Instagram").flatMap((s) => (s.layout ? [{ platform: s.platform, date: s.item.card.date, title: s.item.card.title, layout: s.layout }] : [])),
    ...(coverLayout ? [{ platform: "TikTok" as const, date: firstDate, title: "Cover", layout: coverLayout as DrawableLayout, isCover: true }] : []),
    ...slides.filter((s) => s.platform === "TikTok").flatMap((s) => (s.layout ? [{ platform: s.platform, date: s.item.card.date, title: s.item.card.title, layout: s.layout }] : [])),
  ];
  const shown = slides.filter((s) => s.platform === platform);
  const editing = slides.find((s) => s.id === editingKey);

  // Edits are remembered in this browser as they are made (decision 41). The event's last date lets them expire.
  const lastDateOf = (item: WallItem) => [...item.card.dates].sort().at(-1) ?? item.card.date;
  const changeEdits = (plat: Platform, item: WallItem, next: SlideEdits) => {
    setEdits((prev) => ({ ...prev, [editKey(plat, item)]: next }));
    saveEdits(editKey(plat, item), next, lastDateOf(item));
  };
  const changeCover = (next: SlideEdits) => {
    setEdits((prev) => ({ ...prev, [COVER_KEY]: next }));
    saveEdits(COVER_KEY, next, lastDate);
  };
  const resetCover = () => {
    resetSlide(COVER_KEY);
    setEdits((prev) => ({ ...prev, [COVER_KEY]: {} }));
  };
  const resetOne = (plat: Platform, item: WallItem) => {
    resetSlide(editKey(plat, item));
    setEdits((prev) => ({ ...prev, [editKey(plat, item)]: {} }));
  };
  const resetEverything = () => {
    resetAll();
    setEdits({});
    setConfirmingReset(false);
  };

  const download = async () => {
    setDownloadError(null);
    setBusy(true);
    try {
      await downloadFinished(ready);
    } catch (err) {
      setDownloadError(err instanceof PartialDownloadError ? err.message : "Couldn't download the finished images. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // The optional extra: every slide, both platforms, each as separate pictures to take into Canva (decision 43).
  const downloadForCanva = async () => {
    setDownloadError(null);
    setBusyLayers(true);
    try {
      await downloadLayers(ready);
    } catch (err) {
      setDownloadError(err instanceof PartialDownloadError ? err.message : "Couldn't download the layers. Please try again.");
    } finally {
      setBusyLayers(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20, background: "#000c", display: "flex", justifyContent: "center", overflow: "auto", padding: "24px 16px" }}>
      <div role="dialog" aria-modal="true" aria-label="Make social images" style={{ background: "#08181d", border: "2px solid #f5a93b", borderRadius: 18, padding: 24, width: "min(1100px, 100%)", height: "fit-content", color: "#eaf4f2" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: 22, flex: 1 }}>Make social images</h2>
          <button type="button" onClick={onClose} style={{ ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}>
            Close
          </button>
        </div>
        <div role="tablist" style={{ display: "flex", gap: 8, margin: "16px 0" }}>
          {PLATFORMS.map((p) => (
            <button key={p} role="tab" aria-selected={platform === p} type="button" onClick={() => setPlatform(p)} style={{ ...button, border: platform === p ? 0 : "1.5px solid #6fa3a6", background: platform === p ? "#f5a93b" : "transparent", color: platform === p ? "#1a1200" : "#eaf4f2" }}>
              {p}
            </button>
          ))}
        </div>
        {downloadError && <p role="alert" style={{ color: "#ffb4a0" }}>{downloadError}</p>}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 20 }}>
          {platform === "TikTok" && (
            <li key={cover.id} style={{ width: 270 }}>
              {cover.layout && !cover.error ? (
                <button type="button" aria-label="Edit slide: Cover" onClick={() => setEditingKey(cover.id)} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "transparent", cursor: "pointer" }}>
                  <SlidePreview layout={cover.layout} alt="TikTok cover slide" onError={() => setDrawErrors((prev) => ({ ...prev, [cover.id]: true }))} />
                </button>
              ) : cover.error ? (
                <div data-slide-error style={{ aspectRatio: "9/16", border: "1.5px dashed #ffb4a0", borderRadius: 8, padding: 12, color: "#ffb4a0", fontSize: 14 }}>Couldn&apos;t prepare the cover slide.</div>
              ) : (
                <div style={{ aspectRatio: "9/16", border: "1.5px dashed #4d8185", borderRadius: 8, padding: 12, color: "#9fbfbe", fontSize: 14 }}>Preparing…</div>
              )}
              {slideWarning(cover.layout) && (
                <p data-slide-warning style={{ margin: "8px 0 0", color: "#ffd27a", fontSize: 13 }}>
                  {slideWarning(cover.layout)}
                </p>
              )}
            </li>
          )}
          {shown.map((s) => (
            <li key={s.id} style={{ width: 270 }}>
              {s.layout && !s.error ? (
                <button type="button" aria-label={`Edit slide: ${s.item.card.title}`} onClick={() => setEditingKey(s.id)} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "transparent", cursor: "pointer" }}>
                  <SlidePreview layout={s.layout} alt={`${s.platform} slide: ${s.item.card.title}`} onError={() => setDrawErrors((prev) => ({ ...prev, [s.id]: true }))} />
                </button>
              ) : s.error ? (
                <div data-slide-error style={{ aspectRatio: "9/16", border: "1.5px dashed #ffb4a0", borderRadius: 8, padding: 12, color: "#ffb4a0", fontSize: 14 }}>{`Couldn't prepare the slide for ${s.item.card.title}.`}</div>
              ) : (
                <div style={{ aspectRatio: "9/16", border: "1.5px dashed #4d8185", borderRadius: 8, padding: 12, color: "#9fbfbe", fontSize: 14 }}>Preparing…</div>
              )}
              {slideWarning(s.layout) && (
                <p data-slide-warning style={{ margin: "8px 0 0", color: "#ffd27a", fontSize: 13 }}>
                  {slideWarning(s.layout)}
                </p>
              )}
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <button type="button" onClick={download} disabled={busy || ready.length === 0} style={{ ...button, border: 0, background: ready.length ? "#f5a93b" : "#2d5e66", color: ready.length ? "#1a1200" : "#9fbfbe" }}>
            {busy ? "Preparing download…" : "Download finished images"}
          </button>
          <button type="button" onClick={downloadForCanva} disabled={busyLayers || ready.length === 0} style={{ ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}>
            {busyLayers ? "Preparing layers…" : "Download layers for Canva"}
          </button>
          <button type="button" onClick={onDownloadOriginals} disabled={downloadingOriginals} style={{ ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}>
            Download event images
          </button>
          {confirmingReset ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14 }}>Reset all your edits on every slide? This can&apos;t be undone.</span>
              <button type="button" onClick={resetEverything} style={{ ...button, border: 0, background: "#ffb4a0", color: "#2a0a00" }}>
                Yes, reset everything
              </button>
              <button type="button" onClick={() => setConfirmingReset(false)} style={{ ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}>
                Keep my edits
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmingReset(true)} style={{ ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}>
              Reset everything
            </button>
          )}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#9fbfbe" }}>Layers for Canva: unzip the file first, then upload the pictures from one slide&apos;s folder to Canva. Each is the size of the slide, so they line up.</p>
      </div>
      {editingKey === COVER_ID && coverLayout && (
        <CoverEditPanel
          items={coverItems.map((c) => c.item)}
          sizes={Object.fromEntries(coverItems.map((c) => [c.item.card.key, c.size]))}
          layout={coverLayout}
          edits={edits[COVER_KEY] ?? {}}
          onChange={changeCover}
          onReset={resetCover}
          onClose={() => setEditingKey(null)}
        />
      )}
      {editing?.layout && editing.size && !("images" in editing.layout) && (
        <SlideEditPanel
          platform={editing.platform}
          item={editing.item}
          layout={editing.layout}
          imageSize={editing.size}
          edits={edits[editKey(editing.platform, editing.item)] ?? {}}
          onChange={(next) => changeEdits(editing.platform, editing.item, next)}
          onReset={() => resetOne(editing.platform, editing.item)}
          onClose={() => setEditingKey(null)}
        />
      )}
    </div>
  );
}
