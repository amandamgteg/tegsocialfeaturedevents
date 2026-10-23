# Issue 15: TikTok cover collage

## Goal
Add the first TikTok slide: the top box plus a collage of every selected event.

## What's visible at the end
A cover slide with "Upcoming events from our calendar..." (editable) and a collage of all selected events (usually three, up to about six). Images keep their own shape, sit inside the narrow column, and overlap a little. She can drag, resize and crop each image, and bring any image forward or send it back. There are no dates or titles on the cover. The cover is file 01 in the TikTok set.

## Modules touched
- 12.11 Slide layout (`layoutTikTokCover`)
- 12.12, 12.13, 12.14 (extended)
- Page: TikTok tab

## Failing tests to write first
- For 1 to 6 images, the automatic arrangement keeps every image inside the column and below the top box.
- Images keep their own shape.
- Overlap is small by default. Default order is the order the events were picked.
- Bring forward and send back change the drawing order.
- Dragging, resizing and cropping an image are reflected in the layout and saved.
- The cover has no date or title text.
- Reset returns to the automatic arrangement.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: a three-event cover looks like the approved mock-up, and she can rearrange it.

## Blocked by
Issue 14.
