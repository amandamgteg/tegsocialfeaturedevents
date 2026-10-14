# TESTING.md: v1 test record

Run on **2026-10-14** against the **live TEG feed** (`https://toronto-event-generator.pages.dev/events.json`, built 2026-10-11).

## Read this first: where it was tested

- **Not yet tested on the deployed site.** The tool has not been put on Vercel yet (that needs Amanda to create the Vercel project and set the `TEG_PASSWORD` setting). Issue 10 asks for the checklist to be run on the deployed site, so **this issue is not finished**.
- **What was done instead:** every item below was run in a real browser (Chromium, driven by a script) against a **production build** running in the build environment (`npm run build`, then `npm start`), talking to the **live feed** and the **real event websites**. "PASS (local)" means that. It is a good sign, but it is not the same as passing on Vercel.
- **Still to do on the deployed site:** re-run the 15 items, and in particular check an image between 4.5 MB and 8 MB (see "Vercel response size" below).
- **Still to do by Amanda:** item 15, on her own laptop.

## Section 6 checklist (SPEC.md)

| # | Item | Result | What happened |
|---|---|---|---|
| 1 | Open the tool's web address, and only get in with the shared password. | PASS (local) | no password: page redirects to /login (true), /api/events answers 401; wrong password refused (true); right password lets in |
| 2 | See cards for the starred events in today through +14 days, including Bad Class: Drake vs Kendrick on Oct 1. | PASS (local); the Bad Class part cannot be tested | 13 cards shown for 2026-10-14 to 2026-10-28; independent count of starred events with distinct links in that window from the feed = 13. Bad Class (Oct 1) is in the past, so it cannot be tested (its date is before today) |
| 3 | See cards appear at once and images fill in, with the counter updating as they do. | PASS (local) | counter showed 13 events found · 4 images loaded  →  13 events found · 7 images loaded  →  13 events found · 10 images loaded  →  13 events found · 12 images loaded |
| 4 | Change the dates, and see the list and counter change. | PASS (local) | default "13 events found · 12 images loaded"; to +30 "18 events found · 16 images loaded"; from +10 "8 events found · 8 images loaded"; typing +60 is pulled back to 2026-11-13 |
| 5 | Filter by tag and see the list and counter match, with multiple tags matching ANY. | PASS (local) | tag "community": 5 events found · 4 images loaded (5 cards); plus "food": 6 events found · 5 images loaded (6 cards, a union so never fewer); tag buttons stayed the same (10) |
| 6 | Click an image and see it larger. | PASS (local) | clicking a picture opens a larger view (from /api/image?url=https%3…), Escape closes it |
| 7 | See a multi-day event as a single card. | PASS (local) | "Hot Breath Karaoke" has 3 dates in the window (2026-10-14, 2026-10-21, 2026-10-28) and shows as 1 card |
| 8 | See a link and a paste box on a card with no image, paste a real image link and see it accepted, and paste a non-image link and see it refused. | PASS (local) | no-image card shows event link (true) and paste box (true); a web page link was refused ("That link isn't an image (it looks like …", card unchanged true); a real picture link was accepted (13 events found · 12 images loaded → 13 events found · 13 images loaded) |
| 9 | Find that cards with no image cannot be selected. | PASS (local) | a card with no picture had no way to select it (before the paste fixed it) |
| 10 | Use "Retry failed images". | PASS (local) | The Retry button was shown, with one real failing card (Toronto Pinball League, topl.ca). Pressing it sent a lookup for only that card. It failed again, because that page has no picture on it, so the card stayed as it was and the button stayed. Cards that already had pictures were not looked up again. |
| 11 | Select events, change filters and see the selection survive, with hidden selections counted. | PASS (local) | picked 3: "3 selected"; with tag "games" on: "3 selected (3 hidden by filters)"; cleared: "3 selected", 3 boxes ticked |
| 12 | Refresh the page and keep selections and pasted images, then clear them with "Start over". | PASS (local) | after refresh: "3 selected" and "13 events found · 13 images loaded" (the pasted picture was still there); Start over: "0 selected" and the paste box is back |
| 13 | Download one image as a single file and two or more as a ZIP, with date-and-title file names. | PASS (local) | one pick → file "2026-10-14_artists-in-the-library-animate-with-16mm-film.png" (PNG image data, 940 x 788, 8-bit/color R); three picks → "teg-event-images.zip" containing 2026-10-14_artists-in-the-library-animate-with-16mm-film.png, 2026-10-14_hot-breath-karaoke.avif, 2026-10-14_sip-and-scholar-art-of-the-con.webp |
| 14 | See the plain empty message when a chosen window has no starred events. | PASS (local) | a window with no starred events (2020-01-01 to 2020-01-02) shows the plain message "No starred events in this date range." |
| 15 | Do all of this without keeping any code on her own drive. | NOT TESTED | Not tested. Needs Amanda on her own laptop, using the deployed site. |

Automatic tests also pass: 372 checks across 30 files, all green, before this record was made.

**Item 2 and Bad Class:** SPEC section 6 item 2 was written on 2026-09-30, when Bad Class: Drake vs Kendrick (Oct 1) was in the window. Oct 1 is now in the past, so it cannot be tested. The check was done with the events that are in today's window instead.

## Every starred link in the default window (2026-10-14 to 2026-10-28)

All 13 distinct event links were tested, not a sample. They come from 15 starred events (multi-day events share a link). Each was run through the real image finder (`/api/find-image`) on the local production build. Total run time with 5 at a time: about 4 seconds.

| Date | Event | Website | Result | Failure reason | Time |
|---|---|---|---|---|---|
| 2026-10-14 | Artists in the Library: Animate with 16mm fi | neighbur.net | resolved | - | 2.3 s |
| 2026-10-14 | Hot Breath Karaoke | thehouseofhotbreath.com | resolved | - | 0.5 s |
| 2026-10-14 | Sip and Scholar: Art of the Con | eventbrite.ca | resolved | - | 0.5 s |
| 2026-10-15 | Practical Philosophy Meetup - Toronto | meetup.com | resolved | - | 0.5 s |
| 2026-10-17 | The Commons Problem: AI Governance Megagame  | thecommonsproblem.com | resolved | - | 0.5 s |
| 2026-10-18 | Field Trips: Salmon Run | rciscience.ca | resolved | - | 0.5 s |
| 2026-10-18 | ROM Scavenger Hunt: The Adventures of Indie  | rom.on.ca | resolved | - | 0.3 s |
| 2026-10-19 | Annex Social Game Night | eventbrite.ca | resolved | - | 0.2 s |
| 2026-10-19 | Tech Pizza Monday | luma.com | resolved | - | 0.7 s |
| 2026-10-19 | Toronto Pinball League — Week 4 (Maple) | topl.ca | failed | no usable image found on page | 0.6 s |
| 2026-10-20 | Tinker Tuesday | birdhausto.com | resolved | - | 0.6 s |
| 2026-10-27 | Curiosity Café | beingnbecoming.org | resolved | - | 2.2 s |
| 2026-10-27 | Tinker Tuesday | birdhausto.com | resolved | - | 0.6 s |

**Overall:** 12 of 13 resolved (92%).

### By website

| Website | Resolved | Rate |
|---|---|---|
| neighbur.net | 1 of 1 | 100% |
| thehouseofhotbreath.com | 1 of 1 | 100% |
| eventbrite.ca | 2 of 2 | 100% |
| meetup.com | 1 of 1 | 100% |
| thecommonsproblem.com | 1 of 1 | 100% |
| rciscience.ca | 1 of 1 | 100% |
| rom.on.ca | 1 of 1 | 100% |
| luma.com | 1 of 1 | 100% |
| topl.ca | 0 of 1 | 0% |
| birdhausto.com | 2 of 2 | 100% |
| beingnbecoming.org | 1 of 1 | 100% |

### Failures grouped by cause

| Cause | Count | Which |
|---|---|---|
| Instagram | 0 | - |
| JavaScript-built page | 0 | - |
| Blocked | 0 | - |
| Timeout | 0 | - |
| No image on page | 1 | topl.ca |
| Other | 0 | - |

**Honest limits of these numbers**
- "Resolved" only means the link returned a real image, not that it is the *right* picture. One card on the page showed a site logo rather than an event photo. Amanda can paste a replacement for any card.
- This is one small sample, on one day, from one place. It is not a promise of a success rate. The sites with more than one link here (Eventbrite, Bird Haus) are too few to say anything about.
- Only the topl.ca page failed. It returned a normal page (status 200) that has no preview image and no usable picture on it, so the cause is "no image on page", not blocking.

## Vercel response size

- Vercel Functions cannot send back more than **4.5 MB** in one normal response. Streamed responses do not have that limit (Vercel's own documentation, checked 2026-10-14).
- Amanda chose to **keep the 8 MB cap** (SPEC decision 24). The image proxy therefore streams the picture.
- **Tested locally:** a real 5.5 MB photo (ROM scavenger hunt) came through the proxy and displayed.
- **Not yet tested on Vercel.** If Vercel blocks a streamed picture over 4.5 MB, the card falls back to the event link and the cap should be lowered to 4 MB. The size cap did **not** need changing as a result of this local testing.
- The ZIP is built in the browser, so it never goes through a Vercel response.

## Other things seen

- Retry sent lookups only for cards that had failed.
- Picks, pasted pictures and found pictures were kept across a refresh; Start over cleared picks and pasted pictures, and left the found pictures cached.
- The browser run only covers a desktop-size window (1200 by 1000), as the spec says.
