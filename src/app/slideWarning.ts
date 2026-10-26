import type { DrawableLayout } from "@/lib/slideLayout";

/** The warning to show for a slide, or null. Instagram: the title box reaches the link sticker space. TikTok: TikTok would cover part of it. */
export function slideWarning(layout: DrawableLayout | undefined): string | null {
  if (!layout) return null;
  if ("images" in layout || !("topBox" in layout)) return layout.hiddenByTikTok ? "Part of this slide may be covered by TikTok's buttons or description." : null;
  return layout.overLinkLine ? "The title box runs into the space kept for the link sticker." : null;
}
