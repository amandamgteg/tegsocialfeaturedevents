# Issue 4: Date pickers and tag filter

## Goal
Let Amanda change the date window and filter by tag, with the counter following what is on screen.

## What's visible at the end
- Two calendar pickers for the window. Default is today to +14, and she can go up to +30.
- A tag filter whose options are the tags in the current window's results. Picking several shows events that have any of them.
- The counter ("N events found") matches the cards shown. If images are loaded (issue 2 is merged), the image count matches too.

## Modules touched
- 12.3 Date window and starred filter (`clampWindow`, `tagOptions`, `filterByTags`)
- Page: pickers, tag filter control, counter

## Failing tests to write first
- `clampWindow`: an end date past today+30 is pulled back to today+30; an end before the start is rejected or corrected (see open point); a valid window is returned unchanged.
- `tagOptions`: returns the distinct tags across the window's cards, sorted, and `[]` when there are no cards.
- `tagOptions` is computed from the window's cards before any tag is picked, so picking a tag does not shrink the option list (decision 3).
- `filterByTags`: no tags selected returns all cards; one tag returns cards having it; several tags return cards having any of them (decision 2).
- Changing the window recomputes the tag options. A previously picked tag that is no longer an option is dropped from the selection.
- Counter equals the number of visible cards after any combination of window and tags.
- Empty result still shows the plain empty message.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site against the live feed: widening the window to +30 adds cards, picking two tags shows the union, and the counter matches in every case.
- [ ] Multi-day events remain one card at any window.

## Blocked by
Issue 1. (Independent of issues 2 and 3, so it can be built in parallel with them.)

## Open point
The spec says she can go "up to 30 days ahead" and says nothing about a start date before today. Default for this issue: the start can be any date, only the end is limited. Say if the start should also be limited to today or later.
