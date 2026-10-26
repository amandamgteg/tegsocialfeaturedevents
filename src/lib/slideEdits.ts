import type { ImageEdit, Point, SlideEdits } from "./slideLayout";

// Amanda's slide edits, kept in her own browser (decision 41). One entry per card key, each with the last date of
// its event so the entry can be dropped once the event is over. Every call tolerates storage being missing or blocked.
export const SLIDE_EDITS_KEY = "teg:slide-edits";

type Stored = Record<string, { edits: SlideEdits; lastDate: string }>;

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isText = (v: unknown): v is string => typeof v === "string";
const point = (v: unknown): Point | undefined => {
  const p = v as { x?: unknown; y?: unknown } | null;
  return p && typeof p === "object" && isNumber(p.x) && isNumber(p.y) ? { x: p.x, y: p.y } : undefined;
};

function cleanImageEdit(raw: unknown): ImageEdit {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const edit: ImageEdit = {};
  const pos = point(r.pos);
  const focus = point(r.focus);
  if (pos) edit.pos = pos;
  if (focus) edit.focus = focus;
  if (isNumber(r.scale)) edit.scale = r.scale;
  if (isNumber(r.zoom)) edit.zoom = r.zoom;
  return edit;
}

/** Keeps only the fields that are the right kind of value, so damaged data can never break the editor. */
function clean(raw: unknown): SlideEdits {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const edits: SlideEdits = {};
  if (isText(r.topText)) edits.topText = r.topText;
  if (isText(r.captionText)) edits.captionText = r.captionText;
  for (const name of ["topPos", "captionPos", "imagePos", "focus"] as const) {
    const p = point(r[name]);
    if (p) edits[name] = p;
  }
  if (isNumber(r.imageScale)) edits.imageScale = r.imageScale;
  if (isNumber(r.zoom)) edits.zoom = r.zoom;
  if (r.square === true) edits.square = true;
  if (Array.isArray(r.order)) {
    const order = r.order.filter(isText);
    if (order.length > 0) edits.order = order;
  }
  if (r.collage && typeof r.collage === "object" && !Array.isArray(r.collage)) {
    const collage: Record<string, ImageEdit> = {};
    for (const [key, raw] of Object.entries(r.collage)) {
      const edit = cleanImageEdit(raw);
      if (Object.keys(edit).length > 0) collage[key] = edit;
    }
    if (Object.keys(collage).length > 0) edits.collage = collage;
  }
  return edits;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readAll(): Stored {
  try {
    const raw = storage()?.getItem(SLIDE_EDITS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { edits?: unknown; lastDate?: unknown }> | null;
    const all: Stored = {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [key, entry] of Object.entries(parsed)) {
        const edits = clean(entry?.edits);
        if (isText(entry?.lastDate) && Object.keys(edits).length > 0) all[key] = { edits, lastDate: entry.lastDate };
      }
    }
    return all;
  } catch {
    return {};
  }
}

function writeAll(all: Stored): void {
  try {
    if (Object.keys(all).length === 0) storage()?.removeItem(SLIDE_EDITS_KEY);
    else storage()?.setItem(SLIDE_EDITS_KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked: carry on without remembering.
  }
}

/** The saved edits for one slide (a card key), or none. */
export function loadEdits(key: string): SlideEdits {
  return readAll()[key]?.edits ?? {};
}

/** Saves a slide's edits. `lastDate` is the event's last date (YYYY-MM-DD). A slide with no edits left is not stored. */
export function saveEdits(key: string, edits: SlideEdits, lastDate: string): void {
  const all = readAll();
  const cleaned = clean(edits);
  if (Object.keys(cleaned).length === 0) delete all[key];
  else all[key] = { edits: cleaned, lastDate };
  writeAll(all);
}

export function resetSlide(key: string): void {
  const all = readAll();
  if (!(key in all)) return;
  delete all[key];
  writeAll(all);
}

export function resetAll(): void {
  writeAll({});
}

/** Drops the edits of every event whose last date is before today (the browser's date, decision 5). */
export function pruneExpired(today: Date): void {
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const all = readAll();
  const kept = Object.fromEntries(Object.entries(all).filter(([, entry]) => entry.lastDate >= todayIso));
  if (Object.keys(kept).length !== Object.keys(all).length) writeAll(kept);
}
