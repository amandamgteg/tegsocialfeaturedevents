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

type Paint = (ctx: CanvasRenderingContext2D) => void;
type Loaded = { background: ImageBitmap; bitmaps: ImageBitmap[]; paints: Paint[] };

function newCanvas(layout: DrawableLayout): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't draw the slide in this browser");
  return { canvas, ctx };
}

const toPng = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't save the slide"))), "image/png"));

/** Loads the pictures and sets out the drawing as steps from back to front: background, pictures, then the text boxes. */
async function load(layout: DrawableLayout): Promise<Loaded> {
  // A cover has many pictures, drawn back to front. Every other slide has one.
  const pictures = "images" in layout ? layout.images : [layout.image];
  const [background, ...bitmaps] = await Promise.all([
    loadBitmap(BACKGROUND_URL, "background"),
    ...pictures.map((p) => loadBitmap(`/api/image?url=${encodeURIComponent(p.url)}`, "event image")),
  ]);
  const paints: Paint[] = [
    (ctx) => {
      // Crop the background to fill the tall slide, keeping its middle (decision 35).
      const scale = layout.height / background.height;
      const keptWidth = layout.width / scale;
      ctx.drawImage(background, (background.width - keptWidth) / 2, 0, keptWidth, background.height, 0, 0, layout.width, layout.height);
    },
    ...pictures.map((p, i): Paint => (ctx) => {
      const bitmap = bitmaps[i];
      const s = p.source;
      const wholePicture = s.x <= 0 && s.y <= 0 && s.w >= bitmap.width && s.h >= bitmap.height;
      if (wholePicture) ctx.drawImage(bitmap, p.x, p.y, p.w, p.h);
      else ctx.drawImage(bitmap, s.x, s.y, s.w, s.h, p.x, p.y, p.w, p.h); // only the part she zoomed in on
    }),
    ...("topBox" in layout ? [(ctx: CanvasRenderingContext2D) => drawTextBox(ctx, layout.topBox)] : []), // a TikTok event slide has none
    ...("caption" in layout ? [(ctx: CanvasRenderingContext2D) => drawTextBox(ctx, layout.caption)] : []), // the TikTok cover has none
  ];
  return { background, bitmaps, paints };
}

const release = ({ background, bitmaps }: Loaded) => [background, ...bitmaps].forEach((b) => b.close?.());

/**
 * Draws a slide to a PNG, in the browser (decision 28). The event pictures come through our image proxy (decision 16).
 */
export async function renderSlide(layout: DrawableLayout): Promise<Blob> {
  const loaded = await load(layout);
  try {
    const { canvas, ctx } = newCanvas(layout);
    loaded.paints.forEach((paint) => paint(ctx));
    return await toPng(canvas);
  } finally {
    release(loaded);
  }
}

/**
 * The same slide as separate PNGs, back to front (see `layerNames`). Each is the size of the slide, transparent
 * except for its one piece, so laid over each other they make the finished picture (decision 43).
 */
export async function renderLayers(layout: DrawableLayout): Promise<Blob[]> {
  const loaded = await load(layout);
  try {
    return await Promise.all(
      loaded.paints.map((paint) => {
        const { canvas, ctx } = newCanvas(layout);
        paint(ctx);
        return toPng(canvas);
      }),
    );
  } finally {
    release(loaded);
  }
}
