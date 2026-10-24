import { formatDateLabel } from "./dateLabel";

/** Width of a piece of text in pixels, at a font size. Passed in so the layout needs no real font. */
export type MeasureText = (text: string, fontSizePx: number) => number;
export type Box = { x: number; y: number; w: number; h: number };
export type TextBox = Box & { lines: string[]; fontSize: number; lineHeight: number };
export type Point = { x: number; y: number };
/** Amanda's edits to one slide (decisions 36 to 38). Anything left out is worked out automatically. */
export type SlideEdits = {
  topText?: string;
  captionText?: string;
  /** Where she dragged a box to. Without it the box sits where the automatic layout puts it. */
  topPos?: Point;
  captionPos?: Point;
  imagePos?: Point;
  /** The picture frame's size compared with the automatic fit (1 is the automatic size). */
  imageScale?: number;
  /** How far the picture is zoomed in inside its frame, 1 to 4. */
  zoom?: number;
  /** The middle of the visible part of the picture, from 0 to 1 across and down. */
  focus?: Point;
};
export type SlideLayout = {
  width: number;
  height: number;
  topBox: TextBox;
  /** `source` is the part of the picture shown, in the picture's own pixels. It always fills the frame. */
  image: Box & { url: string; source: Box };
  caption: TextBox;
  /** True when the date-and-title box reaches into the space kept for the Instagram link sticker. */
  overLinkLine: boolean;
};
export type InstagramSlideInput = {
  imageUrl: string;
  imageSize: { width: number; height: number };
  dates: string[];
  title: string;
  /** Defaults to "Upcoming events from our calendar..." (decision 36). */
  topText?: string;
  measureText: MeasureText;
};

// All measurements are SPEC section 13, in pixels on a 1080 by 1920 slide.
export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1920;
export const LINK_LINE_Y = 1590;
export const FONT_FAMILY = 'Arial, Helvetica, "Liberation Sans", sans-serif';
export const DEFAULT_TOP_TEXT = "Upcoming events from our calendar...";
const TOP = { x: 76, y: 236, w: 928, fontSize: 76, lineHeight: 96, padding: 21 };
const CAPTION = { x: 61, w: 958, fontSize: 44, lineHeight: 57, padding: 13 };
const TEXT_SIDE_PADDING = 60; // space kept free inside a box, split between left and right
const GAP = 50;
const IMAGE_MAX = { w: 960, h: 880 };

/** Splits text into lines that fit, breaking at spaces. A word wider than the box stays on its own line. */
function wrap(text: string, maxWidth: number, fontSize: number, measureText: MeasureText): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (current && measureText(next, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function textBox(box: { x: number; y: number; w: number }, spec: { fontSize: number; lineHeight: number; padding: number }, text: string, measureText: MeasureText): TextBox {
  const lines = wrap(text, box.w - TEXT_SIDE_PADDING, spec.fontSize, measureText);
  return { ...box, h: lines.length * spec.lineHeight + spec.padding * 2, lines, fontSize: spec.fontSize, lineHeight: spec.lineHeight };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const tidy = (v: number) => Math.round(v * 1000) / 1000;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const MIN_IMAGE_SCALE = 0.2;
export const MAX_IMAGE_SCALE = 1.5;

/** The part of the picture to show, always the same shape as the frame and never past the picture's edge. */
function cropSource(size: { width: number; height: number }, zoom: number | undefined, focus: Point | undefined): Box {
  const z = clamp(zoom ?? 1, MIN_ZOOM, MAX_ZOOM);
  const w = size.width / z;
  const h = size.height / z;
  const x = clamp(clamp(focus?.x ?? 0.5, 0, 1) * size.width - w / 2, 0, size.width - w);
  const y = clamp(clamp(focus?.y ?? 0.5, 0, 1) * size.height - h / 2, 0, size.height - h);
  return { x: tidy(x), y: tidy(y), w: tidy(w), h: tidy(h) };
}

/**
 * The Instagram story slide for one event (decisions 29, 32, 36 to 38).
 * Without edits it is the automatic layout. With edits, a box she dragged stays where she put it. The rest follows:
 * the image sits 50 px under the top box and the date-and-title box 50 px under the image, so the two gaps are equal.
 * If she moved the date-and-title box, the image is centred between it and the top box, so the gaps stay equal.
 */
export function layoutInstagramSlide(input: InstagramSlideInput, edits: SlideEdits = {}): SlideLayout {
  const { imageSize, measureText } = input;
  const topBox = textBox({ x: edits.topPos?.x ?? TOP.x, y: edits.topPos?.y ?? TOP.y, w: TOP.w }, TOP, edits.topText ?? input.topText ?? DEFAULT_TOP_TEXT, measureText);
  const topBottom = topBox.y + topBox.h;

  // Keep the image's own shape, as big as fits, then apply her size change.
  const fit = Math.min(IMAGE_MAX.w / imageSize.width, IMAGE_MAX.h / imageSize.height);
  const scale = fit * clamp(edits.imageScale ?? 1, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
  const w = Math.round(imageSize.width * scale);
  const h = Math.round(imageSize.height * scale);
  const y = edits.imagePos ? edits.imagePos.y : edits.captionPos ? topBottom + Math.max(0, (edits.captionPos.y - topBottom - h) / 2) : topBottom + GAP;
  const image = { x: edits.imagePos?.x ?? (SLIDE_WIDTH - w) / 2, y, w, h, url: input.imageUrl, source: cropSource(imageSize, edits.zoom, edits.focus) };

  const caption = textBox(
    { x: edits.captionPos?.x ?? CAPTION.x, y: edits.captionPos?.y ?? image.y + image.h + GAP, w: CAPTION.w },
    CAPTION,
    edits.captionText ?? `${formatDateLabel(input.dates)} - ${input.title}`,
    measureText,
  );
  return { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, topBox, image, caption, overLinkLine: caption.y + caption.h > LINK_LINE_Y };
}
