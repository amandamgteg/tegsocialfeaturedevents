# Issue 2: Images fill in

## Goal
Find each card's image from the event's own web page and show it through our own server. This is the core of the tool and the largest issue. Everything image-related lands together because none of it is visible alone.

## What's visible at the end
Cards load with placeholders (from issue 1). Images appear one by one as they are found, about 5 lookups at a time. The top line reads like "12 events found · 9 images loaded". A card whose lookup failed shows a link to the event page instead of an image (the paste box comes in issue 7).

## Modules touched
- 12.6 URL safety validator and shared image check (`assertSafeUrl`, `fetchImage`)
- 12.7 Image proxy (`proxyImage`, `GET /api/image`)
- 12.5 Extractor (copied from Task 1, with the two edits listed in the spec)
- 12.4 Adapter (`findImageForCard`, `POST /api/find-image`)
- Page: the 5-at-a-time lookup runner, card image states, counter

## Failing tests to write first
Validator (`assertSafeUrl`, `fetchImage`), with `fetch` and DNS stubbed:
- Rejects non-http(s) schemes (`file:`, `ftp:`, `javascript:`, `data:`).
- Rejects `localhost`, `127.0.0.1`, `10.x`, `172.16-31.x`, `192.168.x`, `169.254.x`, `::1`, and a hostname that resolves to a private address.
- Rejects a public URL that redirects to a private address, and checks every hop of a redirect chain.
- Rejects a response with no Content-Type, and one that isn't `image/*`.
- Rejects a body over 8 MB, including one that lies about or omits Content-Length.
- Times out after 8 s.
- A valid small `image/png` returns `ok: true` with its content type; with `readBody: true` it returns the bytes.

Proxy:
- A safe image URL streams the bytes with the upstream content type and a cache header.
- An unsafe or non-image URL returns a 4xx, never the upstream body.
- Unauthenticated requests are refused (the middleware from issue 1).

Extractor (characterization tests for the copied code, with page fetches stubbed):
- A page with an `og:image` resolves to it. With none, it falls back through Twitter image, JSON-LD, then `<img>` in the documented order.
- A logo or tiny image is skipped. A candidate that fails the shared check is skipped, and the next candidate is tried.
- No candidate gives `failed` with a reason.
- A candidate with no Content-Type is now rejected (the section 11 gap), and the page HTML read is capped.

Adapter:
- Maps a card to the seven fields exactly as section 10 says (`eventUrlType: "external"`, `embeddedImageUrl` empty, `sourceUrl` = url, `mishaHosted: false`, `id` = card id).
- Sends a one-item list and returns `ImageResult` (resolved with `imageUrl`, or failed with `reason`).
- A thrown error becomes `failed`, never an unhandled rejection.

Page:
- The runner never has more than 5 lookups in flight, and starts the next as one finishes.
- Counter text updates as results arrive. A failed lookup shows the event link.

## Acceptance criteria
- [ ] All the tests above pass.
- [ ] First action before building the proxy: check Vercel's response-size limit for functions and record it in the spec's open items. If the 8 MB cap exceeds it, raise it with Amanda before continuing.
- [ ] On the deployed site with the live feed, images fill in progressively and the counter matches what is on screen.
- [ ] Images in the page load from `/api/image`, never directly from the source site (decision 16).
- [ ] `/api/image` and `/api/find-image` cannot be used to reach a private address or a non-web URL.
- [ ] The extractor files are a verbatim copy except the two documented edits, and the diff against Task 1 shows only those.
- [ ] Not required: a particular success rate. Failures are expected for Instagram and JavaScript-built pages (section 7).

## Blocked by
Issue 1.

## Note on size
If this is too big to review, the split is not by layer. Cut by first landing validator + proxy behind a developer-only check, then extractor + adapter + cards. That first cut has nothing visible, so it isn't a real vertical slice. Prefer to keep this issue whole and review it in commits.
