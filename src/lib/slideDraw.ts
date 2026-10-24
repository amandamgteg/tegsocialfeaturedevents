import { FONT_FAMILY, type SlideLayout, type TextBox } from "./slideLayout";

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
export async function renderSlide(layout: SlideLayout): Promise<Blob> {
  const [background, image] = await Promise.all([
    loadBitmap(BACKGROUND_URL, "background"),
    loadBitmap(`/api/image?url=${encodeURIComponent(layout.image.url)}`, "event image"),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't draw the slide in this browser");

  const scale = layout.height / background.height;
  const keptWidth = layout.width / scale;
  ctx.drawImage(background, (background.width - keptWidth) / 2, 0, keptWidth, background.height, 0, 0, layout.width, layout.height);
  const { x, y, w, h, source: s } = layout.image;
  const wholePicture = s.x <= 0 && s.y <= 0 && s.w >= image.width && s.h >= image.height;
  if (wholePicture) ctx.drawImage(image, x, y, w, h);
  else ctx.drawImage(image, s.x, s.y, s.w, s.h, x, y, w, h); // only the part she zoomed in on
  drawTextBox(ctx, layout.topBox);
  drawTextBox(ctx, layout.caption);
  background.close?.();
  image.close?.();

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't save the slide"))), "image/png"));
}
