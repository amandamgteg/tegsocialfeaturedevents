"use client";
import { useEffect, useMemo, useState } from "react";
import { PartialDownloadError } from "@/lib/download";
import { renderSlide } from "@/lib/slideDraw";
import { layoutInstagramSlide, type SlideLayout } from "@/lib/slideLayout";
import { downloadFinished } from "@/lib/socialZip";
import { canvasTextMeasurer, measureImage } from "./slideSupport";
import type { WallItem } from "./PhotoWall";

type Slide = { key: string; item: WallItem; layout?: SlideLayout; previewUrl?: string; error?: string };

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
  const [slides, setSlides] = useState<Slide[]>(() => items.map((item) => ({ key: item.card.key, item })));
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const measureText = useMemo(() => canvasTextMeasurer(), []);
  // `items` is a new array on every render of the page, so the effect watches what is actually in it.
  const signature = items.map((i) => `${i.card.key}|${i.imageUrl}|${i.card.dates.join()}|${i.card.title}`).join("\n");

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setSlides(items.map((item) => ({ key: item.card.key, item })));
    items.forEach(async (item) => {
      const update = (patch: Partial<Slide>) => !cancelled && setSlides((prev) => prev.map((s) => (s.key === item.card.key ? { ...s, ...patch } : s)));
      try {
        const imageSize = await measureImage(item.imageUrl);
        const layout = layoutInstagramSlide({ imageUrl: item.imageUrl, imageSize, dates: item.card.dates, title: item.card.title, measureText });
        const previewUrl = URL.createObjectURL(await renderSlide(layout));
        urls.push(previewUrl);
        if (cancelled) return URL.revokeObjectURL(previewUrl);
        update({ layout, previewUrl });
      } catch {
        update({ error: `Couldn't prepare the slide for ${item.card.title}.` });
      }
    });
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = slides.flatMap((s) => (s.layout ? [{ platform: "Instagram" as const, date: s.item.card.date, title: s.item.card.title, layout: s.layout }] : []));

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
              {s.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.previewUrl} alt={`Instagram slide: ${s.item.card.title}`} style={{ display: "block", width: "100%", aspectRatio: "9/16", borderRadius: 8 }} />
              ) : s.error ? (
                <div data-slide-error style={{ aspectRatio: "9/16", border: "1.5px dashed #ffb4a0", borderRadius: 8, padding: 12, color: "#ffb4a0", fontSize: 14 }}>{s.error}</div>
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
    </div>
  );
}
