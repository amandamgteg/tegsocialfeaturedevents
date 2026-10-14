# Issue 7: Fix a missing image by pasting a link

## Goal
Let Amanda give a card an image by pasting a link, checked first. This also fixes the Task 1 bug where a bad pasted link counted as resolved (decision 15).

## What's visible at the end
- A card with no image shows a link to the event page and a paste box.
- Pasting a real image link makes the image appear on the card, and the card becomes selectable. The counter goes up.
- Pasting something that isn't an image shows a message saying so, and the card stays as it was.

## Modules touched
- 12.8 Paste-URL checker (`checkPastedImage`, `POST /api/check-image`)
- 12.6 Validator (consumed)
- 12.7 Image proxy (consumed, to show the pasted image)
- Page: paste box, card state

## Failing tests to write first
- `checkPastedImage`: a URL that returns `image/jpeg` is `ok: true` with the URL back.
- Fails for: an HTML page, a missing Content-Type, a non-http(s) URL, a private address, a redirect to a private address, an oversized image, a timeout, an empty string and a non-URL string. Each returns `ok: false` with a readable reason.
- The route refuses unauthenticated requests.
- Page: on `ok: false` the card is exactly as before (not resolved, not selectable) and shows the reason.
- Page: on `ok: true` the card becomes resolved, counted, selectable, and displays through `/api/image`.
- A failing paste does not clear a previous successful one.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: paste a real image link and see it accepted, and paste a non-image link and see it refused (section 6, item 8).
- [ ] The check uses the same validator as the proxy. No separate rules.

## Blocked by
- Issue 2 (validator and proxy).
- Issue 5 (selectability). Without it, "becomes selectable" has nothing to test.
