import type { EventItem, ExtractionResult } from "./types";
import { fetchImage, fetchPage, readTextCapped } from "../safeUrl";

type ImageCandidate = {
  url: string;
  source: "embedded" | "meta" | "json-ld" | "img";
};

const HANDLE_OVERRIDES: Record<string, string> = {
  "trampoline hall": "trampolinehall",
  luminato: "luminatofestival",
  "jazz fest": "torontojazzfest",
  "bata shoe": "batashoemuseum",
  tiff: "tiff_net",
  bell: "tiff_net",
  harbourfront: "harbourfrontcentre",
  "hot docs": "hotdocs_",
  bentway: "thebentway",
  "aga khan": "agakhanmuseum",
  "outdoor art": "torontooutdoorart"
};

function normalizeHandle(value: string) {
  return value.replace(/^@+/, "").replace(/[^a-zA-Z0-9_.]/g, "").trim();
}

function inferredHandle(title: string) {
  const lower = title.toLowerCase();
  const override = Object.entries(HANDLE_OVERRIDES).find(([key]) => lower.includes(key));
  if (override) return override[1];
  return normalizeHandle(title.toLowerCase().replace(/\s+/g, ""));
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (entity, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    })
    .replace(/&#(\d+);/g, (entity, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10);
      return Number.isFinite(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function extractAttribute(tag: string, attribute: string) {
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, "i");
  const match = tag.match(pattern);
  return match?.[2] ? decodeEntities(match[2]) : undefined;
}

function extractMeta(html: string, property: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const expected = property.toLowerCase();

  for (const tag of tags) {
    const name = extractAttribute(tag, "property") ?? extractAttribute(tag, "name");
    if (name?.toLowerCase() !== expected) continue;

    const content = extractAttribute(tag, "content");
    if (content) return content;
  }

  return undefined;
}

function normalizeImageUrl(rawUrl: string | undefined, baseUrl: string) {
  if (!rawUrl) return null;

  const decoded = decodeEntities(rawUrl);
  if (!decoded || decoded.startsWith("data:") || decoded.startsWith("blob:")) return null;

  try {
    return new URL(decoded, baseUrl).toString();
  } catch {
    return null;
  }
}

function pushCandidate(candidates: ImageCandidate[], rawUrl: string | undefined, baseUrl: string, source: ImageCandidate["source"]) {
  const url = normalizeImageUrl(rawUrl, baseUrl);
  if (!url || candidates.some((candidate) => candidate.url === url)) return;
  candidates.push({ url, source });
}

function collectJsonLdImageValue(value: unknown, candidates: string[]) {
  if (typeof value === "string") {
    candidates.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdImageValue(item, candidates);
    return;
  }

  if (!value || typeof value !== "object") return;

  const object = value as Record<string, unknown>;
  collectJsonLdImageValue(object.url ?? object.contentUrl ?? object.thumbnailUrl, candidates);
}

function collectJsonLdImages(value: unknown, candidates: string[]) {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdImages(item, candidates);
    return;
  }

  if (!value || typeof value !== "object") return;

  const object = value as Record<string, unknown>;
  if ("image" in object) collectJsonLdImageValue(object.image, candidates);
  if ("@graph" in object) collectJsonLdImages(object["@graph"], candidates);
}

function extractJsonLdImages(html: string) {
  const scriptPattern = /<script\b[^>]*type=["'][^"']*application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates: string[] = [];

  for (const match of html.matchAll(scriptPattern)) {
    const rawJson = match[1].trim();
    for (const source of [rawJson, decodeEntities(rawJson)]) {
      try {
        collectJsonLdImages(JSON.parse(source) as unknown, candidates);
        break;
      } catch {
        continue;
      }
    }
  }

  return candidates;
}

function numericAttribute(tag: string, attribute: string) {
  const value = extractAttribute(tag, attribute);
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickLargestFromSrcset(srcset: string | undefined) {
  if (!srcset) return undefined;

  const candidates = srcset
    .split(",")
    .map((entry) => {
      const [url, descriptor] = entry.trim().split(/\s+/, 2);
      const width = descriptor?.endsWith("w") ? Number.parseInt(descriptor, 10) : 0;
      return { url, width: Number.isFinite(width) ? width : 0 };
    })
    .filter((candidate) => candidate.url);

  return candidates.sort((a, b) => b.width - a.width)[0]?.url;
}

function extractPageImages(html: string) {
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  const candidates: string[] = [];

  for (const tag of tags) {
    const className = extractAttribute(tag, "class") ?? "";
    const alt = extractAttribute(tag, "alt") ?? "";
    const skippable = /logo|icon|avatar|sprite|tracking|pixel/i.test(`${className} ${alt}`);
    if (skippable) continue;

    const width = numericAttribute(tag, "width");
    const height = numericAttribute(tag, "height");
    if (width !== null && height !== null && (width < 250 || height < 250)) continue;

    candidates.push(
      pickLargestFromSrcset(extractAttribute(tag, "srcset")) ??
        extractAttribute(tag, "src") ??
        extractAttribute(tag, "data-src") ??
        extractAttribute(tag, "data-original") ??
        ""
    );
  }

  return candidates.filter(Boolean);
}

function buildImageCandidates(event: EventItem, html?: string) {
  const candidates: ImageCandidate[] = [];
  pushCandidate(candidates, event.embeddedImageUrl, event.sourceUrl, "embedded");

  if (!html) return candidates;

  pushCandidate(candidates, extractMeta(html, "og:image"), event.eventUrl, "meta");
  pushCandidate(candidates, extractMeta(html, "twitter:image"), event.eventUrl, "meta");

  for (const image of extractJsonLdImages(html)) {
    pushCandidate(candidates, image, event.eventUrl, "json-ld");
  }

  for (const image of extractPageImages(html)) {
    pushCandidate(candidates, image, event.eventUrl, "img");
  }

  return candidates;
}

function isInstagramCdnUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("cdninstagram.com") || host.includes("fbcdn.net");
  } catch {
    return false;
  }
}

function extractInstagramHandle(html: string) {
  const decoded = decodeEntities(html);
  const urlPattern = /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/gi;
  const reservedPaths = new Set(["p", "reel", "reels", "stories", "explore", "accounts"]);

  for (const match of decoded.matchAll(urlPattern)) {
    const handle = normalizeHandle(match[1]);
    if (handle && !reservedPaths.has(handle.toLowerCase())) return handle;
  }

  return undefined;
}

async function validateImageUrl(url: string) {
  return (await fetchImage(url)).ok;
}

async function firstValidImage(candidates: ImageCandidate[]) {
  let sawInstagramCdn = false;

  for (const candidate of candidates) {
    sawInstagramCdn = sawInstagramCdn || isInstagramCdnUrl(candidate.url);
    if (await validateImageUrl(candidate.url)) {
      return {
        candidate,
        failureReason: ""
      };
    }
  }

  return {
    candidate: null,
    failureReason: sawInstagramCdn ? "Instagram image candidate failed validation" : "image candidate failed validation"
  };
}

export async function extractImagesAndHandles(events: EventItem[]): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];

  for (const event of events) {
    try {
      if (event.eventUrlType === "internal") {
        const candidates = buildImageCandidates(event);
        const embeddedCandidate = await firstValidImage(candidates);
        if (embeddedCandidate.candidate) {
          results.push({
            eventId: event.id,
            status: "resolved",
            imageUrl: embeddedCandidate.candidate.url,
            instagramHandle: inferredHandle(event.title)
          });
          continue;
        }

        results.push({
          eventId: event.id,
          status: "failed",
          instagramHandle: inferredHandle(event.title),
          failureReason: candidates.length ? embeddedCandidate.failureReason : "no external event page or embedded image found"
        });
        continue;
      }

      const response = await fetchPage(event.eventUrl, {
        headers: { "user-agent": "TEG/0.1 image extractor" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`site returned ${response.status}`);
      }

      const html = await readTextCapped(response);
      const handleFromHtml = extractInstagramHandle(html);
      const candidates = buildImageCandidates(event, html);
      const resolved = await firstValidImage(candidates);

      if (!resolved.candidate) {
        results.push({
          eventId: event.id,
          status: "failed",
          instagramHandle: normalizeHandle(handleFromHtml ?? inferredHandle(event.title)),
          failureReason: candidates.length ? resolved.failureReason : "no usable image found on page"
        });
        continue;
      }

      results.push({
        eventId: event.id,
        status: "resolved",
        imageUrl: resolved.candidate.url,
        instagramHandle: normalizeHandle(handleFromHtml ?? inferredHandle(event.title))
      });
    } catch (error) {
      results.push({
        eventId: event.id,
        status: "failed",
        instagramHandle: inferredHandle(event.title),
        failureReason: (error as Error).message
      });
    }
  }

  return results;
}
