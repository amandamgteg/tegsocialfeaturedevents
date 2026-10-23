# Issue 14: TikTok event slides

## Goal
Add TikTok event slides, in the narrow column, soonest event first.

## What's visible at the end
A TikTok tab with one slide per selected event, soonest first. Each has the event image (own shape, at most 800 px wide) and the date-and-title box below, centred left to right and top to bottom in the usable area, clear of the right-hand icons. A "Fill square" button zooms the image into an 800×800 square. Editing, reset and saved edits work as on Instagram. Downloaded files include "TikTok" and are numbered.

## Modules touched
- 12.11 Slide layout (`layoutTikTokEventSlide`)
- 12.12, 12.13, 12.14 (extended)
- Page: TikTok tab

## Failing tests to write first
- The image and box are inside x 140 to 940, and nothing enters the icon area.
- The stack is centred in the band y 150 to 1600, both axes.
- Landscape images shrink to the column width. Portrait images fit the height.
- "Fill square" gives an 800×800 image with a crop she can move and zoom.
- Slides are in soonest-first order.
- File names include "TikTok" and a number, starting at 02 because the cover is 01.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: slides look like the approved mock-up.
- [ ] A test post on TikTok shows nothing covered by icons (recorded in issue 17).

## Blocked by
Issue 12.
