import { FONT_FAMILY, type MeasureText } from "@/lib/slideLayout";

/** The natural size of an event image, fetched through the image proxy (decision 16). */
export async function measureImage(imageUrl: string): Promise<{ width: number; height: number }> {
  const res = await fetch(`/api/image?url=${encodeURIComponent(imageUrl)}`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close?.();
  return size;
}

/** Measures text in the same bold Arial the slides are drawn in, so line breaks match what is drawn. */
export function canvasTextMeasurer(): MeasureText {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) throw new Error("Couldn't measure text in this browser");
  return (text, fontSize) => {
    ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
    return ctx.measureText(text).width;
  };
}
