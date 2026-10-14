# Issue 9: Remember picks across refreshes, and Start over

## Goal
Closing or refreshing the page keeps Amanda's selections and pasted images. A "Start over" button clears them.

## What's visible at the end
- Refresh the page: the same cards are selected, and pasted images are still in place.
- A "Start over" button clears selections and pasted images.
- An event that has left the feed drops out of her saved picks.

## Modules touched
- Page: persistence of selection and pasted images (UI state, not a module)

## Failing tests to write first
- Selection and pasted images are saved to browser storage, keyed by event URL, and restored on load.
- Pasted images restore as resolved and selectable, without a new check call.
- A saved URL that is no longer in the feed is dropped from the selection and the pasted images on load.
- A saved selection for an event outside the current window is kept, so changing the window and back keeps it (decision 9).
- Start over clears selections and pasted images, and does not touch the browser cache of found images from issue 3.
- If browser storage is unavailable or holds corrupt data, the page loads normally with nothing selected.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: select 2, paste an image on a third, refresh, and all of it is still there. Start over clears it (section 6, items 11 and 12).

## Blocked by
- Issue 5 (selection).
- Issue 7 (pasted images).

## Open point
Pasted images persist but were only checked once. If the source later stops serving the image, the card will show a broken image. v1 accepts this. Say if it should be re-checked on load.
