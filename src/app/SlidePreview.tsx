"use client";
import { useEffect, useRef, useState } from "react";
import { renderSlide } from "@/lib/slideDraw";
import type { DrawableLayout } from "@/lib/slideLayout";

/** A slide drawn from its layout. The old picture stays until the new one is ready, so edits don't flicker. */
export function SlidePreview({ layout, alt, onError }: { layout: DrawableLayout; alt: string; onError?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const current = useRef<string | null>(null);
  const signature = JSON.stringify(layout);

  useEffect(() => {
    let cancelled = false;
    renderSlide(layout)
      .then((blob) => {
        if (cancelled) return;
        const next = URL.createObjectURL(blob);
        if (current.current) URL.revokeObjectURL(current.current);
        current.current = next;
        setUrl(next);
      })
      .catch(() => !cancelled && onError?.());
    return () => {
      cancelled = true;
    };
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current);
    },
    [],
  );

  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt={alt} draggable={false} style={{ display: "block", width: "100%", aspectRatio: "9/16", borderRadius: 8 }} />;
  return <div style={{ aspectRatio: "9/16", border: "1.5px dashed #4d8185", borderRadius: 8, padding: 12, color: "#9fbfbe", fontSize: 14 }}>Preparing…</div>;
}
