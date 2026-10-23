import { formatDateLabel } from "./dateLabel";

/** Width of a piece of text in pixels, at a font size. Passed in so the layout needs no real font. */
export type MeasureText = (text: string, fontSizePx: number) => number;
export type Box = { x: number; y: number; w: number; h: number };
export type TextBox = Box & { lines: string[]; fontSize: number; lineHeight: number };
export type SlideLayout = {
  width: number;
  height: number;
  topBox: TextBox;
  image: Box & { url: string };
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

/** The Instagram story slide for one event (decisions 29, 32, 37, 38). */
export function layoutInstagramSlide(input: InstagramSlideInput): SlideLayout {
  const { imageSize, measureText } = input;
  const topBox = textBox(TOP, TOP, input.topText ?? DEFAULT_TOP_TEXT, measureText);

  // Keep the image's own shape, as big as fits.
  const scale = Math.min(IMAGE_MAX.w / imageSize.width, IMAGE_MAX.h / imageSize.height);
  const w = Math.round(imageSize.width * scale);
  const h = Math.round(imageSize.height * scale);
  const image = { x: (SLIDE_WIDTH - w) / 2, y: topBox.y + topBox.h + GAP, w, h, url: input.imageUrl };

  const caption = textBox({ x: CAPTION.x, y: image.y + image.h + GAP, w: CAPTION.w }, CAPTION, `${formatDateLabel(input.dates)} - ${input.title}`, measureText);
  return { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, topBox, image, caption, overLinkLine: caption.y + caption.h > LINK_LINE_Y };
}
