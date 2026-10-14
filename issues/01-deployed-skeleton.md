# Issue 1: Deployed skeleton: password gate, feed, date-window cards with placeholders

## Goal
Stand up the whole stack end to end and deploy it to Vercel: log in with the shared password, read the live feed, and show the starred events in the default window as cards with placeholder images. Every later issue builds on this one.

## What's visible at the end
At the live Vercel address:
1. Anyone without the password sees only a login page. Direct requests to `/` and `/api/events` without the cookie are refused.
2. After entering the password, cards appear for starred events from today through +14 days, soonest first. Each shows date, title, tags and a gray placeholder where the image will go. A multi-day event appears once.
3. A line at the top reads "N events found". There is no image count yet.
4. A window with no starred events shows a plain empty message.

## Modules touched
- 12.1 Auth gate (all three functions)
- 12.2 Feed client (`fetchFeed`)
- 12.3 Date window and starred filter (`defaultWindow`, `buildCards` only)
- Plumbing: `/api/events` route, auth middleware, login page, the card list page, Vercel project settings

Not touched: `clampWindow`, `tagOptions`, `filterByTags` (issue 4) and everything image-related (issue 2).

## Failing tests to write first
Write these before any implementation. All use small inline fixtures shaped like the real feed (decision 19 rules out a sample-data mode in the product, not fixtures in tests).
- `verifyPassword`: right password is true, wrong or empty is false, and an unset password setting is always false (never "open by default").
- `startSession` + `isAuthenticated`: a request carrying the issued cookie is authenticated; no cookie, a tampered cookie, or a cookie signed for a different password is not.
- Middleware: unauthenticated `GET /` redirects to login; unauthenticated `GET /api/events` returns 401; authenticated requests pass; the login route itself is reachable.
- `fetchFeed`: maps a raw feed event to `FeedEvent` (`misha-star` becomes `starred`, `date` and `tags` kept, `featured`/`overlay`/`cap` dropped); an event with `misha-star` missing becomes `starred: false`; a non-200 or malformed response throws a clear error.
- `defaultWindow`: for a given `today` returns today through today+14, inclusive.
- `buildCards`: drops unstarred events; drops events outside the window; includes both ends of the window; collapses repeated `url`s into one card using the first date in the window and that date's `id`; sorts soonest first; does not use `past`; returns `[]` for an empty window.
- Page: with zero cards, the empty message renders; with N cards, "N events found" renders.

## Acceptance criteria
- [ ] All the tests above pass locally and in the Vercel build.
- [ ] The site is live on a Vercel URL linked to the GitHub repo, and a push to the branch updates it.
- [ ] The password is a Vercel environment setting and appears nowhere in the repo or in client-side code. There is no second secret: the session cookie is signed using the password itself.
- [ ] Without the cookie, no page or `/api/*` route returns event data.
- [ ] Against the live feed, the card count for today to +14 matches a count computed independently from the feed's JSON (starred, in window, distinct `url`s).
- [ ] "Today" is the browser's date, not the feed's `today` field (decision 5).
- [ ] Cards show date, title, tags and placeholder only. No description, time or venue (decision 6).
- [ ] Amanda has opened the live URL in her browser and logged in.

## Blocked by
Nothing.

## Needs from Amanda (not code)
- Create the Vercel project from the GitHub repo and set the password setting. Claude can't do this from the cloud session.
- Confirm the stack. The spec doesn't name one. This issue assumes Next.js (App Router) with TypeScript, because Vercel hosts it natively and the modules are written as `Request`/`Response` functions.
