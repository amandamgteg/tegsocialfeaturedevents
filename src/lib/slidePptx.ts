import PptxGenJS from "pptxgenjs";
import type { DrawableLayout, TextBox } from "./slideLayout";

/** The background picture (null for a plain black slide) and each picture cut to its own frame, back to front. */
export type Pieces = { background: Blob | null; pictures: Blob[] };

// A slide pixel is 1/96 inch, so the file opens at the slide's real size. Text sizes are in points: 3 points for every 4 pixels.
const inch = (px: number) => px / 96;
const pt = (px: number) => px * 0.75;
const SIDE_PADDING = 30; // pixels kept free left and right inside a text box, the same as when the slide is drawn
const VERTICAL_PADDING = { top: 21, caption: 13 }; // pixels above and below the text, as in the slide layout

function dataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function addTextBox(slide: PptxGenJS.Slide, box: TextBox, padding: number) {
  // The words are one paragraph, so Canva wraps them itself when she edits. margin is [left, right, bottom, top].
  slide.addText(box.lines.join(" "), {
    x: inch(box.x),
    y: inch(box.y),
    w: inch(box.w),
    h: inch(box.h),
    fontFace: "Arial",
    fontSize: pt(box.fontSize),
    bold: true,
    color: "FFFFFF",
    fill: { color: "000000" },
    align: "center",
    valign: "middle",
    lineSpacing: pt(box.lineHeight),
    margin: [pt(SIDE_PADDING), pt(SIDE_PADDING), pt(padding), pt(padding)],
  });
}

/**
 * A PowerPoint file of one slide with live text (decision 43): the background and pictures as pictures, and the wording as
 * text boxes in Arial. Canva opens it with the wording editable. Everything is stacked as it is on the finished image.
 */
export async function buildEditablePptx(layout: DrawableLayout, pieces: Pieces): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "SOCIAL_SLIDE", width: inch(layout.width), height: inch(layout.height) });
  pptx.layout = "SOCIAL_SLIDE";
  const slide = pptx.addSlide();

  if (pieces.background) slide.addImage({ data: await dataUri(pieces.background), x: 0, y: 0, w: inch(layout.width), h: inch(layout.height) });
  else slide.background = { color: "000000" };

  const frames = "images" in layout ? layout.images : [layout.image];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    slide.addImage({ data: await dataUri(pieces.pictures[i]), x: inch(f.x), y: inch(f.y), w: inch(f.w), h: inch(f.h) });
  }
  if ("topBox" in layout) addTextBox(slide, layout.topBox, VERTICAL_PADDING.top);
  if ("caption" in layout) addTextBox(slide, layout.caption, VERTICAL_PADDING.caption);

  const data = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  return new Blob([data], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}
