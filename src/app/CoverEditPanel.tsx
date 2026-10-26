"use client";
import { useRef, useState } from "react";
import { MAX_IMAGE_SCALE, MAX_ZOOM, MIN_IMAGE_SCALE, MIN_ZOOM, SLIDE_HEIGHT, SLIDE_WIDTH, type ImageEdit, type SlideEdits, type TikTokCoverLayout } from "@/lib/slideLayout";
import type { WallItem } from "./PhotoWall";
import { SlidePreview } from "./SlidePreview";
import { slideWarning } from "./slideWarning";

type Size = { width: number; height: number };
const STAGE_WIDTH = 360;
const TOP = "top";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const button = { minHeight: 44, borderRadius: 999, padding: "0 16px", fontSize: 14, fontWeight: 700 } as const;
const outline = { ...button, border: "1.5px solid #6fa3a6", background: "transparent", color: "#eaf4f2" } as const;
const field = { width: "100%", font: "inherit", fontSize: 14, padding: 8, borderRadius: 10, border: "1.5px solid #6fa3a6", background: "#0d2830", color: "#eaf4f2" } as const;

/** Editing the TikTok cover: the top box wording, and for each picture its place, size, crop and whether it is in front (decisions 36 and 39). */
export function CoverEditPanel({
  items,
  sizes,
  layout,
  edits,
  onChange,
  onReset,
  onClose,
}: {
  items: WallItem[];
  sizes: Record<string, Size>;
  layout: TikTokCoverLayout;
  edits: SlideEdits;
  onChange: (edits: SlideEdits) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string>(layout.images[0]?.key ?? "");
  const [cropMode, setCropMode] = useState(false);
  const [dragging, setDragging] = useState<{ key: string; dx: number; dy: number } | null>(null);
  const titleOf = (key: string) => items.find((i) => i.card.key === key)?.card.title ?? "";
  const imageEdit = (key: string): ImageEdit => edits.collage?.[key] ?? {};
  const setImageEdit = (key: string, patch: Partial<ImageEdit>) => onChange({ ...edits, collage: { ...edits.collage, [key]: { ...imageEdit(key), ...patch } } });
  const warning = slideWarning(layout);
  const orderKeys = layout.images.map((i) => i.key);
  const position = orderKeys.indexOf(selected);

  const move = (offset: number) => {
    const next = [...orderKeys];
    const to = clamp(position + offset, 0, next.length - 1);
    next.splice(position, 1);
    next.splice(to, 0, selected);
    onChange({ ...edits, order: next });
  };

  const commit = (key: string, dx: number, dy: number) => {
    if (key === TOP) {
      const b = layout.topBox;
      return onChange({ ...edits, topPos: { x: clamp(b.x + dx, 0, SLIDE_WIDTH - b.w), y: clamp(b.y + dy, 0, SLIDE_HEIGHT - b.h) } });
    }
    const img = layout.images.find((i) => i.key === key)!;
    if (cropMode) {
      // Dragging moves the picture inside its frame, so the visible part moves the other way.
      const size = sizes[key];
      const s = img.source;
      const fx = (s.x + s.w / 2) / size.width - (dx * s.w) / (img.w * size.width);
      const fy = (s.y + s.h / 2) / size.height - (dy * s.h) / (img.h * size.height);
      return setImageEdit(key, { focus: { x: clamp(fx, 0, 1), y: clamp(fy, 0, 1) } });
    }
    setImageEdit(key, { pos: { x: clamp(img.x + dx, 0, SLIDE_WIDTH - img.w), y: clamp(img.y + dy, 0, SLIDE_HEIGHT - img.h) } });
  };

  const startDrag = (key: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (key !== TOP) setSelected(key);
    const width = stage.current?.getBoundingClientRect().width || STAGE_WIDTH;
    const k = SLIDE_WIDTH / width; // slide pixels for each screen pixel
    const [x0, y0] = [e.clientX, e.clientY];
    const onMove = (ev: MouseEvent) => setDragging({ key, dx: (ev.clientX - x0) * k, dy: (ev.clientY - y0) * k });
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDragging(null);
      commit(key, (ev.clientX - x0) * k, (ev.clientY - y0) * k);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const overlay = (key: string, label: string, b: { x: number; y: number; w: number; h: number }) => {
    const shift = dragging?.key === key && !(cropMode && key !== TOP) ? dragging : null;
    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        aria-label={label}
        onMouseDown={startDrag(key)}
        style={{
          position: "absolute",
          left: `${((b.x + (shift?.dx ?? 0)) / SLIDE_WIDTH) * 100}%`,
          top: `${((b.y + (shift?.dy ?? 0)) / SLIDE_HEIGHT) * 100}%`,
          width: `${(b.w / SLIDE_WIDTH) * 100}%`,
          height: `${(b.h / SLIDE_HEIGHT) * 100}%`,
          outline: key === selected ? "3px solid #7fe0ea" : "2px dashed #f5a93b",
          cursor: cropMode && key !== TOP ? "grab" : "move",
        }}
      />
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, background: "#000d", display: "flex", justifyContent: "center", overflow: "auto", padding: "24px 16px" }}>
      <div role="dialog" aria-modal="true" aria-label="Edit slide: Cover" style={{ background: "#08181d", border: "2px solid #f5a93b", borderRadius: 18, padding: 24, width: "min(860px, 100%)", height: "fit-content", color: "#eaf4f2", display: "flex", flexWrap: "wrap", gap: 24 }}>
        <div ref={stage} data-testid="slide-stage" style={{ position: "relative", width: STAGE_WIDTH, maxWidth: "100%", userSelect: "none" }}>
          <SlidePreview layout={layout} alt="Preview: Cover" />
          {layout.images.map((img) => overlay(img.key, `Move image: ${titleOf(img.key)}`, img))}
          {overlay(TOP, "Move the top box", layout.topBox)}
        </div>
        <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Edit slide: Cover</h2>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
            Top box wording
            <textarea rows={2} value={edits.topText ?? layout.topBox.lines.join(" ")} onChange={(e) => onChange({ ...edits, topText: e.target.value })} style={field} />
          </label>
          <div style={{ fontSize: 14 }}>Pictures on the cover</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {items.map((i) => (
              <button key={i.card.key} type="button" aria-pressed={selected === i.card.key} aria-label={`Select image: ${i.card.title}`} onClick={() => setSelected(i.card.key)} style={{ ...outline, background: selected === i.card.key ? "#7fe0ea" : "transparent", color: selected === i.card.key ? "#04242a" : "#eaf4f2" }}>
                {i.card.title}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
            Image size
            <input type="range" min={MIN_IMAGE_SCALE * 100} max={MAX_IMAGE_SCALE * 100} step={1} value={Math.round((imageEdit(selected).scale ?? 1) * 100)} onChange={(e) => setImageEdit(selected, { scale: Number(e.target.value) / 100 })} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
            Zoom
            <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.05} value={imageEdit(selected).zoom ?? 1} onChange={(e) => setImageEdit(selected, { zoom: Number(e.target.value) })} />
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" aria-pressed={cropMode} onClick={() => setCropMode((on) => !on)} style={{ ...outline, background: cropMode ? "#7fe0ea" : "transparent", color: cropMode ? "#04242a" : "#eaf4f2" }}>
              Move the picture inside its frame
            </button>
            <button type="button" onClick={() => move(1)} disabled={position < 0 || position >= orderKeys.length - 1} style={outline}>
              Bring forward
            </button>
            <button type="button" onClick={() => move(-1)} disabled={position <= 0} style={outline}>
              Send back
            </button>
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
              style={outline}
            >
              Reset to original
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
