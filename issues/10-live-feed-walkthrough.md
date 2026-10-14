# Issue 10: Live-feed walkthrough and test record

## Goal
Prove v1 is done against the live feed, and leave the measured results and tested links that the Task 1 review found missing (section 11: no measured success rate, no saved test examples).

## What's visible at the end
A `TESTING.md` in the repo with: the section 6 checklist ticked off on the deployed site, a table of the real event links tried (website, resolved or failed, failure reason), and the success rate by website. It also records the Vercel response-size limit and whether the size cap needed changing.

## Modules touched
None. This issue adds no product code, only the record.

## Failing tests to write first
No automated tests. Write the checklist first, from section 6 items 1 to 15, with a pass or fail line for each, and run it from the deployed site, not locally.

## Acceptance criteria
- [ ] Every section 6 item is marked pass on the deployed site, or has a written reason it isn't.
- [ ] Includes Bad Class: Drake vs Kendrick on Oct 1 only if it is still inside a testable window. Otherwise the record says so (section 6, item 2 was written for 2026-09-30).
- [ ] The link table covers every starred link in the default window, not a sample.
- [ ] Failures are grouped by cause (Instagram, JavaScript-built page, blocked, timeout, no image on page).
- [ ] Section 8 numbers in `SPEC.md` are refreshed or a note says they are historic.
- [ ] Amanda has used it on her own laptop with no code on her own drive (section 6, item 15).

## Blocked by
Issues 1 to 9.
