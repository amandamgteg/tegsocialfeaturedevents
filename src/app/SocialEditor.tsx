"use client";
import { useEffect, useMemo, useState } from "react";
import { PartialDownloadError } from "@/lib/download";
import { layoutInstagramSlide, type SlideEdits } from "@/lib/slideLayout";
import { downloadFinished } from "@/lib/socialZip";
import { canvasTextMeasurer, measureImage } from "./slideSupport";
import type { WallItem } from "./PhotoWall";
import { SlideEditPanel } from "./SlideEditPanel";
import { SlidePreview } from "./SlidePreview";

type Size = { width: number; height: number };

const button = { minHeight: 44, borderRadius: 999, padding: "0 18px", fontSize: 15, fontWeight: 700 } as const;

/** "Make social images": a preview of every picked event as a finished Instagram slide (SPEC section 3, step 11). */
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
  const [edits, setEdits] = useState<Record<string, SlideEdits>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [drawErrors, setDrawErrors] = useState<Record<string, true>>({});
  const [busy, setBusy] = useState(false);
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

  const slides = items.map((item) => {
    const key = item.card.key;
    const size = sizes[key];
    const layout =
      size && size !== "error"
        ? layoutInstagramSlide({ imageUrl: item.imageUrl, imageSize: size, dates: item.card.dates, title: item.card.title, measureText }, edits[key])
        : undefined;
    return { key, item, size: size && size !== "error" ? size : undefined, layout, error: size === "error" || drawErrors[key] };
  });
  const ready = slides.flatMap((s) => (s.layout ? [{ platform: "Instagram" as const, date: s.item.card.date, title: s.item.card.title, layout: s.layout }] : []));
  const editing = slides.find((s) => s.key === editingKey);

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
          <button role="tab" aria-selected="true" type="button" style={{ ...button, border: 0, background: "#f5a93b", color: "#1a1200" }}>
            Instagram
          </button>
        </div>
        {downloadError && <p role="alert" style={{ color: "#ffb4a0" }}>{downloadError}</p>}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: 20 }}>
          {slides.map((s) => (
            <li key={s.key} style={{ width: 270 }}>
              {s.layout && !s.error ? (
                <button type="button" aria-label={`Edit slide: ${s.item.card.title}`} onClick={() => setEditingKey(s.key)} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "transparent", cursor: "pointer" }}>
                  <SlidePreview layout={s.layout} alt={`Instagram slide: ${s.item.card.title}`} onError={() => setDrawErrors((prev) => ({ ...prev, [s.key]: true }))} />
                </button>
              ) : s.error ? (
                <div data-slide-error style={{ aspectRatio: "9/16", border: "1.5px dashed #ffb4a0", borderRadius: 8, padding: 12, color: "#ffb4a0", fontSize: 14 }}>{`Couldn't prepare the slide for ${s.item.card.title}.`}</div>
              ) : (
                <div style={{ aspectRatio: "9/16", border: "1.5px dashed #4d8185", borderRadius: 8, padding: 12, color: "#9fbfbe", fontSize: 14 }}>Preparing…</div>
              )}
              {s.layout?.overLinkLine && (
                <p data-slide-warning style={{ margin: "8px 0 0", color: "#ffd27a", fontSize: 13 }}>
                  The title box runs into the space kept for the link sticker.
                </p>
              )}
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <button type="button" onClick={download} disabled={busy || ready.length === 0} style={{ ...button, border: 0, background: ready.length ? "#f5a93b" : "#2d5e66", color: ready.length ? "#1a1200" : "#9fbfbe" }}>
            {busy ? "Preparing download…" : "Download finished images"}
          </button>
          <button type="button" onClick={onDownloadOriginals} disabled={downloadingOriginals} style={{ ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}>
            Download event images
          </button>
        </div>
      </div>
      {editing?.layout && editing.size && (
        <SlideEditPanel
          item={editing.item}
          layout={editing.layout}
          imageSize={editing.size}
          edits={edits[editing.key] ?? {}}
          onChange={(next) => setEdits((prev) => ({ ...prev, [editing.key]: next }))}
          onClose={() => setEditingKey(null)}
        />
      )}
    </div>
  );
}
