# Issue 8: Download selected images

## Goal
Download the selected images: one as a single file, two or more as a ZIP, named by date and title.

## What's visible at the end
A Download button. With one selection, the browser saves one image file such as `2026-10-07_tinker-tuesday.jpg`. With two or more, it saves a ZIP of such files. Files land in her Downloads folder. Selections hidden by filters are included.

## Modules touched
- 12.9 Download and ZIP (`downloadSelected`, `fileNameFor`)
- 12.7 Image proxy (consumed)
- Page: Download button

## Failing tests to write first
`fileNameFor`:
- Builds `date_slug.ext` from date and title, for example `2026-10-07_tinker-tuesday.jpg`.
- Slug rules: lowercase, punctuation and accents handled, spaces become hyphens, an empty or all-symbol title still gives a usable name, long titles are shortened.
- Extension comes from the content type (`image/jpeg` is `.jpg`, `image/png` is `.png`, `image/webp` is `.webp`). A URL ending in `.php` with `image/jpeg` gives `.jpg`.

`downloadSelected` (fetch stubbed, ZIP read back in the test):
- One item triggers one file download with that file's name and bytes, not a ZIP.
- Two or more items give one ZIP with each image under its name.
- Two items with the same date and title get distinct names in the ZIP.
- Selected items hidden by filters are included.
- If one image fails to fetch, the others still download and the user is told which one failed. It does not silently drop it.

Page: the Download button is disabled with nothing selected.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: one image downloads as a single file, three download as a ZIP that opens with correct names (section 6, item 13).
- [ ] The ZIP is built in the browser from images fetched via `/api/image` (decision 27), so no server response carries the ZIP.
- [ ] Download is images only, with no link list (decision 11).

## Blocked by
Issue 5 (needs selection). Issue 2 comes with it.
