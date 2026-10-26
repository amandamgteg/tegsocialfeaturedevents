import { FONT_FAMILY, type DrawableLayout, type TextBox } from "./slideLayout";

export const BACKGROUND_URL = "/social/lab-background.webp";

async function loadBitmap(url: string, what: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load the ${what} (status ${res.status})`);
  return createImageBitmap(await res.blob());
}

/** Draws a text box: a black rectangle with white bold text, each line centred. */
function drawTextBox(ctx: CanvasRenderingContext2D, box: TextBox) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${box.fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  box.lines.forEach((line, i) => {
    ctx.fillText(line, box.x + box.w / 2, box.y + box.h / 2 + (i - (box.lines.length - 1) / 2) * box.lineHeight);
  });
}

/**
 * Draws a slide to a PNG, in the browser (decision 28). The background is the lab image, cropped to fill the
 * tall slide with its middle kept (decision 35). The event image comes through our image proxy (decision 16).
 */
export async function renderSlide(layout: DrawableLayout): Promise<Blob> {
  // A cover has many pictures, drawn back to front. Every other slide has one.
  const pictures = "images" in layout ? layout.images : [layout.image];
  const [background, ...bitmaps] = await Promise.all([
    loadBitmap(BACKGROUND_URL, "background"),
    ...pictures.map((p) => loadBitmap(`/api/image?url=${encodeURIComponent(p.url)}`, "event image")),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't draw the slide in this browser");

  const scale = layout.height / background.height;
  const keptWidth = layout.width / scale;
  ctx.drawImage(background, (background.width - keptWidth) / 2, 0, keptWidth, background.height, 0, 0, layout.width, layout.height);
  pictures.forEach((p, i) => {
    const bitmap = bitmaps[i];
    const s = p.source;
    const wholePicture = s.x <= 0 && s.y <= 0 && s.w >= bitmap.width && s.h >= bitmap.height;
    if (wholePicture) ctx.drawImage(bitmap, p.x, p.y, p.w, p.h);
    else ctx.drawImage(bitmap, s.x, s.y, s.w, s.h, p.x, p.y, p.w, p.h); // only the part she zoomed in on
  });
  if ("topBox" in layout) drawTextBox(ctx, layout.topBox); // a TikTok event slide has none
  if ("caption" in layout) drawTextBox(ctx, layout.caption); // the TikTok cover has none
  background.close?.();
  bitmaps.forEach((b) => b.close?.());

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't save the slide"))), "image/png"));
}
