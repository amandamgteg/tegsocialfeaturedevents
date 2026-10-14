# Issue 3: Retry failed images and remember found images

## Goal
Let Amanda retry cards that failed, and stop re-finding images that were already found when she reloads.

## What's visible at the end
- A "Retry failed images" button. It tries again only for cards still missing an image, and the counter updates.
- After a reload, cards that were resolved earlier show their images straight away, with no lookup delay.

## Modules touched
- Page: retry button, lookup runner skip logic, browser cache (UI state, not a module)
- 12.4 Adapter route: response cache headers on `/api/find-image` (the "plus cache headers" part of decision 23)

## Failing tests to write first
- Cache: a resolved result is stored under the event URL (not the card id, which changes with the window) and read back.
- Cache: a failed result is never stored.
- Cache: if browser storage is unavailable or throws, the page still works and just looks images up every time.
- Runner: a card with a cached result makes no `/api/find-image` call.
- Retry: calls `/api/find-image` only for cards with `failed` status, not resolved or in-flight ones, and respects the 5-at-a-time limit.
- Retry: a card that succeeds on retry gets its image and the counter goes up. One that fails again stays failed.
- Retry button is hidden or disabled when nothing has failed.
- `/api/find-image` responses for resolved results carry a cache header. Failed ones do not.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: reload shows previously found images without new lookups (visible in the network tab as no `/api/find-image` calls for them).
- [ ] "Retry failed images" works on a real failing card.
- [ ] Decision 23 holds: no server-side store of any kind.

## Blocked by
Issue 2.

## To confirm
Decision 23 says "keyed by event URL plus cache headers". This issue reads it as: browser storage keyed by event URL, plus HTTP cache headers on the lookup response. If you meant something else, say so before this is built.
