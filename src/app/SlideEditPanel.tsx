"use client";
import { useRef, useState } from "react";
import { MAX_IMAGE_SCALE, MAX_ZOOM, MIN_IMAGE_SCALE, MIN_ZOOM, SLIDE_HEIGHT, SLIDE_WIDTH, type AnyLayout, type SlideEdits } from "@/lib/slideLayout";
import type { WallItem } from "./PhotoWall";
import { SlidePreview } from "./SlidePreview";

type BoxName = "top" | "image" | "caption";
const STAGE_WIDTH = 360;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const button = { minHeight: 44, borderRadius: 999, padding: "0 16px", fontSize: 14, fontWeight: 700 } as const;
const field = { width: "100%", font: "inherit", fontSize: 14, padding: 8, borderRadius: 10, border: "1.5px solid #6fa3a6", background: "#0d2830", color: "#eaf4f2" } as const;

/** Editing one Instagram slide: wording, dragging the boxes and the picture, size, zoom and crop (decisions 36 to 38). */
export function SlideEditPanel({
  platform,
  item,
  layout,
  imageSize,
  edits,
  onChange,
  onReset,
  onClose,
}: {
  platform: "Instagram" | "TikTok";
  item: WallItem;
  layout: AnyLayout;
  imageSize: { width: number; height: number };
  edits: SlideEdits;
  onChange: (edits: SlideEdits) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const title = item.card.title;
  const stage = useRef<HTMLDivElement>(null);
  const [cropMode, setCropMode] = useState(false);
  const [dragging, setDragging] = useState<{ box: BoxName; dx: number; dy: number } | null>(null);
  const { image, caption } = layout;
  const topBox = "topBox" in layout ? layout.topBox : null; // a TikTok event slide has no top box
  const boxes = { top: topBox ?? caption, image, caption } as const;

  const commit = (box: BoxName, dx: number, dy: number) => {
    if (box === "image" && cropMode) {
      // Dragging moves the picture inside the frame, so the visible part moves the other way.
      const s = image.source;
      const fx = (s.x + s.w / 2) / imageSize.width - (dx * s.w) / (image.w * imageSize.width);
      const fy = (s.y + s.h / 2) / imageSize.height - (dy * s.h) / (image.h * imageSize.height);
      return onChange({ ...edits, focus: { x: clamp(fx, 0, 1), y: clamp(fy, 0, 1) } });
    }
    const b = boxes[box];
    const pos = { x: clamp(b.x + dx, 0, SLIDE_WIDTH - b.w), y: clamp(b.y + dy, 0, SLIDE_HEIGHT - b.h) };
    onChange({ ...edits, ...(box === "top" ? { topPos: pos } : box === "image" ? { imagePos: pos } : { captionPos: pos }) });
  };

  const startDrag = (box: BoxName) => (e: React.MouseEvent) => {
    e.preventDefault();
    const width = stage.current?.getBoundingClientRect().width || STAGE_WIDTH;
    const k = SLIDE_WIDTH / width; // slide pixels for each screen pixel
    const [x0, y0] = [e.clientX, e.clientY];
    const move = (ev: MouseEvent) => setDragging({ box, dx: (ev.clientX - x0) * k, dy: (ev.clientY - y0) * k });
    const up = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setDragging(null);
      commit(box, (ev.clientX - x0) * k, (ev.clientY - y0) * k);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const overlay = (box: BoxName, label: string) => {
    const b = boxes[box];
    const shift = dragging?.box === box && !(box === "image" && cropMode) ? dragging : null;
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onMouseDown={startDrag(box)}
        style={{
          position: "absolute",
          left: `${((b.x + (shift?.dx ?? 0)) / SLIDE_WIDTH) * 100}%`,
          top: `${((b.y + (shift?.dy ?? 0)) / SLIDE_HEIGHT) * 100}%`,
          width: `${(b.w / SLIDE_WIDTH) * 100}%`,
          height: `${(b.h / SLIDE_HEIGHT) * 100}%`,
          outline: "2px dashed #f5a93b",
          cursor: box === "image" && cropMode ? "grab" : "move",
        }}
      />
    );
  };

  const gapAbove = topBox ? Math.round(image.y - (topBox.y + topBox.h)) : 0;
  const gapBelow = Math.round(caption.y - (image.y + image.h));
  const warning = "topBox" in layout ? (layout.overLinkLine ? "The title box runs into the space kept for the link sticker." : null) : layout.hiddenByTikTok ? "Part of this slide may be covered by TikTok's buttons or description." : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, background: "#000d", display: "flex", justifyContent: "center", overflow: "auto", padding: "24px 16px" }}>
      <div role="dialog" aria-modal="true" aria-label={`Edit slide: ${title}`} style={{ background: "#08181d", border: "2px solid #f5a93b", borderRadius: 18, padding: 24, width: "min(860px, 100%)", height: "fit-content", color: "#eaf4f2", display: "flex", flexWrap: "wrap", gap: 24 }}>
        <div ref={stage} data-testid="slide-stage" style={{ position: "relative", width: STAGE_WIDTH, maxWidth: "100%", userSelect: "none" }}>
          <SlidePreview layout={layout} alt={`Preview: ${title}`} />
          {overlay("image", "Move the image")}
          {topBox && overlay("top", "Move the top box")}
          {overlay("caption", "Move the date and title box")}
        </div>
        <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Edit slide: {title}</h2>
          {topBox && (
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
              Top box wording
              <textarea rows={2} value={edits.topText ?? topBox.lines.join(" ")} onChange={(e) => onChange({ ...edits, topText: e.target.value })} style={field} />
            </label>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
            Date and title wording
            <textarea rows={2} value={edits.captionText ?? caption.lines.join(" ")} onChange={(e) => onChange({ ...edits, captionText: e.target.value })} style={field} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
            Image size
            <input type="range" min={MIN_IMAGE_SCALE * 100} max={MAX_IMAGE_SCALE * 100} step={1} value={Math.round((edits.imageScale ?? 1) * 100)} onChange={(e) => onChange({ ...edits, imageScale: Number(e.target.value) / 100 })} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
            Zoom
            <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.05} value={edits.zoom ?? 1} onChange={(e) => onChange({ ...edits, zoom: Number(e.target.value) })} />
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" aria-pressed={cropMode} onClick={() => setCropMode((on) => !on)} style={{ ...button, border: "1.5px solid #6fa3a6", background: cropMode ? "#7fe0ea" : "transparent", color: cropMode ? "#04242a" : "#eaf4f2" }}>
              Move the picture inside its frame
            </button>
            {platform === "TikTok" ? (
              <>
                <button type="button" aria-pressed={!!edits.square} onClick={() => onChange({ ...edits, square: !edits.square, zoom: undefined, focus: undefined })} style={{ ...button, border: "1.5px solid #6fa3a6", background: edits.square ? "#7fe0ea" : "transparent", color: edits.square ? "#04242a" : "#eaf4f2" }}>
                  Fill square
                </button>
                <button type="button" onClick={() => onChange({ ...edits, imagePos: undefined, captionPos: undefined })} style={{ ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}>
                  Centre the slide
                </button>
              </>
            ) : (
              <button type="button" onClick={() => onChange({ ...edits, imagePos: undefined })} style={{ ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}>
                Even out the gaps
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#b9d3d2" }}>
            {topBox && <span>Above the image: {gapAbove} px</span>}
            <span>{topBox ? "Below the image" : "Between the image and the box"}: {gapBelow} px</span>
          </div>
          {warning && (
            <p data-slide-warning style={{ margin: 0, color: "#ffd27a", fontSize: 13 }}>
              {warning}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={onClose} style={{ ...button, border: 0, background: "#f5a93b", color: "#1a1200" }}>
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                setCropMode(false);
                onReset();
              }}
              style={{ ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" }}
            >
              Reset to original
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
