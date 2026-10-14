# Issue 5: Select events

## Goal
Let Amanda select events she wants, with a running count and honest handling of selections hidden by filters.

## What's visible at the end
- Each card with an image has a way to select it. Cards with no image cannot be selected.
- A running count: for example "5 selected (2 hidden by filters)".
- Changing dates or tags keeps selections.

## Modules touched
- 12.3 (consumed, not changed)
- Page: selection state (UI state, not a module), card selected state, count line

## Failing tests to write first
- Selecting and deselecting a card changes the selected set, with no upper limit (decision 8).
- Selection is keyed by event URL, not card id. The card id depends on the window and would orphan selections when dates change.
- A card with `failed` or placeholder status cannot be selected (decision 15).
- A selected card that is filtered out stays selected, and the count text reports how many are hidden (decision 9).
- Count text with 0 hidden shows no "hidden" clause.
- A card that fails on retry after being selected is handled: it is deselected, since it can no longer be downloaded.

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: select 3, change a tag filter so one disappears, and the count says 3 selected, 1 hidden. Clear the filter and all 3 are still selected.
- [ ] No-image cards show no way to select.

## Blocked by
- Issue 2 (needs image status per card).
- Issue 4 (needs filters to have anything to hide).
