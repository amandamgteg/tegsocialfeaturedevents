# Issue 12: Edit Instagram slides

## Goal
Edit each Instagram slide before downloading.

## What's visible at the end
Click a slide to edit it. She can change the wording of the top box and the date-and-title box (each slide separately), drag the boxes, drag the image, and zoom or crop the image. Font and colour cannot be changed. The two gaps around the image stay equal. A long title makes the box grow downward, with the same text size. A visible warning appears if the box goes past the link-sticker line.

## Modules touched
- 12.11 Slide layout (accepts edits)
- 12.12 Slide drawing
- Page: slide editor

## Failing tests to write first
- Changing the top-box text changes only that slide.
- Changing the date-and-title text re-lays out the box (taller if more lines), with the same text size.
- Making the image bigger or smaller keeps the two gaps equal. Moving the date-and-title box re-centres the image between it and the top box, so the gaps stay equal. Zooming never moves or resizes the frame. Dragging the image itself puts it exactly where she drops it, and "Even out the gaps" brings equal gaps back.
- Crop and zoom never leave empty space inside the image frame.
- Dragging a text box moves it and is reflected in the layout.
- The link-sticker warning appears when the box passes the line, and disappears when it does not.
- Download uses the edited slides.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: edit text, move and zoom an image on one slide, download, and see the changes in the file.
- [ ] The other slides are unchanged.

## Blocked by
Issue 11.
