# Issue 13: Remember edits and reset

## Goal
Keep her edits across refreshes, with a reset.

## What's visible at the end
Refreshing the page keeps every edit. "Reset to original" on a slide puts that slide back to the automatic version. A "Reset everything" button does it for all slides. Edits for an event are dropped after its date has passed. Edits live in this browser on this computer only.

## Modules touched
- 12.13 Saved edits
- Page: editor

## Failing tests to write first
- Saved edits come back after a reload.
- Reset for one slide changes only that slide.
- Reset everything clears all edits.
- Edits for events whose date has passed are dropped.
- If browser storage is unavailable, the editor still works without saving.
- A repeating event's dates keep separate edits (decision 7).

## Acceptance criteria
- [ ] Tests above pass.
- [ ] On the deployed site: edit, refresh, see edits; reset one slide; reset everything.

## Blocked by
Issue 12.
