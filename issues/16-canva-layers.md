# Issue 16: Layers for Canva

## Goal
An optional download that gives each slide's layers as separate images.

## What's visible at the end
A separate "Download layers for Canva" button. It saves a ZIP with, for each slide, the finished image plus each layer (background, each event image, each text box) as its own transparent PNG. Layers are positioned to match the slide, so they can be placed in Canva. Text arrives as pictures, so it is not editable text. The main downloads are unchanged.

## Modules touched
- 12.12 Slide drawing (`renderLayers`)
- 12.14 Social ZIP (`downloadLayers`)
- Page: button

## Failing tests to write first
- Each layer is a PNG the size of the slide, with transparency, positioned where it sits on the slide.
- Laying the layers over each other gives the same picture as the finished image.
- File names say which slide and which layer, with the platform.
- The collage's layers follow the saved order, forward and back.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: the ZIP downloads, and Amanda tries one slide in Canva (recorded in issue 17).

## Blocked by
Issues 12 and 15.
