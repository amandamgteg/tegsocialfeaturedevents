# Issue 6: Larger image view

## Goal
Let Amanda look closer at a card's picture before choosing.

## What's visible at the end
Clicking a card's image opens a larger view of it, and it can be closed.

## Modules touched
- 12.7 Image proxy (consumed)
- Page: larger view component

## Failing tests to write first
- Clicking a resolved card's image opens the larger view showing that image, loaded from `/api/image`.
- Closing works with the close control, the Escape key and a click outside the image.
- Placeholder and no-image cards have nothing to click.
- Opening and closing does not change selection or filters.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] Works on the deployed site with a real image.

## Blocked by
Issue 2.
