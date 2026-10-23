# Issue 11: Instagram slides, filled in automatically

## Goal
After selecting events, open an editor and see one finished Instagram slide per selected event, then download them as a ZIP.

## What's visible at the end
A "Make social images" button that opens an editor with an Instagram tab. Each selected event shows as a 1080×1920 preview: lab background, top box ("Upcoming events from our calendar..."), the event image in its own shape, and a date-and-title box such as "Oct 21 - Community Dinner #1". The gaps are equal. A "Download finished images" button saves a ZIP of PNGs with "Instagram" in the file names. The existing "Download event images" button still works as before. Nothing is editable yet.

## Modules touched
- 12.10 Date label (`formatDateLabel`)
- 12.11 Slide layout (`layoutInstagramSlide`)
- 12.12 Slide drawing (`renderSlide`)
- 12.14 Social ZIP (`downloadFinished`, Instagram only)
- 12.7 Image proxy (consumed)
- Page: "Make social images" button, editor shell

## Failing tests to write first
`formatDateLabel`:
- One date gives "Oct 21". Months read Jan, Feb, March, Apr, May, June, July, Aug, Sept, Oct, Nov, Dec. No "st" or "th".
- Consecutive days give "July 1-3". Days across a month change give "June 30-July 2".
- Other dates give "July 1, 4, 6".

`layoutInstagramSlide`:
- Top box is at the section 13 position.
- Square, landscape and portrait images keep their shape and fit the Instagram maximum.
- The gap above and the gap below the image are equal (about 50 px).
- A long title makes the date-and-title box taller, with the same text size.
- A box that passes the link-sticker line is flagged.

`renderSlide` (canvas stubbed): returns a 1080×1920 PNG blob.

`downloadFinished`: one ZIP, file names include "Instagram" and the date, in date order, duplicates get distinct names.

Page: the editor opens with the selected events only. Hidden-by-filter selections are included.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: pick three events, open the editor, see three Instagram slides, download a ZIP that opens with correct images.
- [ ] Images are loaded through `/api/image` (decision 16).
- [ ] The existing download buttons behave as before.

## Blocked by
Issues 5 and 8.
