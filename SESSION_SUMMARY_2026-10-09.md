# TEG Social Event Picker: Session Summary for India

**Date:** 2026-10-09 · **Who:** Amanda and Claude · **Branch:** `main`

## What we did

- Read the three Task 1 image-finding files (`extractor.ts`, `imageFetch.ts`, `types.ts`) and checked them against `SPEC.md`. Amanda uploaded the files because `/reference/reusable-extractor/` did not exist in this environment.
- Checked the live feed (`toronto-event-generator.pages.dev/events.json`) for its real field names.
- Updated `SPEC.md`: decisions 22 to 26, plus three new sections (9, 10 and 11). Decisions 1 to 21 are unchanged. Pushed to the branch.

## What the Task 1 code showed

- **How an image is found:** the finder opens the event's page and tries, in order, an embedded image, the preview image (og:image), the Twitter preview image, JSON-LD images, then `<img>` tags. The first one that passes the check wins. On failure it records "failed" with a reason and does not retry.
- **Two separate image checks that disagree.** The extractor's check accepts a missing Content-Type and has no size limit. `imageFetch.ts` rejects a missing Content-Type and has an 8 MB limit. They also use different timeouts and user agents.
- **Everything runs one event at a time**, and results only come back when the whole list is done.
- **Seven fields, not six.** The input type also requires `mishaHosted: false`, which the finder never reads.
- **`imageFetch.ts` is not used by `extractor.ts`.** Nothing in the three files calls it.
- **No filesystem use and no environment variables**, which is good for Vercel.
- **Not seen:** the Task 1 adapter, and the bug in decision 15 ("a bad pasted link counted as resolved").

## What the live feed showed

- The feed was built on 2026-10-04 and has 1,426 events.
- Misha's stars are in a field called `misha-star`. There is no field called `starred`. `featured` is an exact copy of it.
- 82 events are starred, and all 31 auto-starred events are among them.
- 18 starred events are dated 2026-10-09 or later, on 11 different links.
- The feed has no image field. It does have `id`, `title` and `url`.
- Starred events have only 64 different links across 82 events, because multi-day events repeat.

## Decisions Amanda made today

- The three uploaded files are the source of truth for the spec update.
- The spec describes the extractor's input as seven fields.
- One call per event card (one per event link), not per feed event, about 5 at a time.
- Decision 23 (browser cache keyed by event URL plus cache headers) stays as written.
- Size cap and timeout: use what makes sense for v1. I used the code's existing 8 MB and 8 seconds.
- Decision 15's Task 1 bug claim stays as written for v1.
- The adapter fills the missing fields with fixed values: `eventUrlType` is always "external", `sourceUrl` is the event link, `embeddedImageUrl` is empty, and `mishaHosted` is false.

## What didn't work

- The code files were not where the first request said they would be, so my first report could only describe `SPEC.md`.

## Not done or not verified

- **Website test results** from Amanda's pasted notes (which of 7 sites load and have a preview image, and the "too many requests" reply from Hot Breath) were not re-run and are not in the spec.
- **Pasted spec edits not applied:** the new test-results section, the section 7 and 8 edits, and the note on the 82 versus 96 starred count. Section 8 of `SPEC.md` still has the 2026-09-30 numbers (96 starred, 32 auto-starred, the older feed window).
- **Why the starred count dropped from 96 to 82** is unknown. I can't see the old feed.
- **Vercel's response-size limit** (relevant to the image proxy and ZIP downloads) has not been checked.
- **No slice plan exists**, so every known gap in the spec says "To be assigned".
- **Left for later:** who calls `fetchImageBuffer` in Task 1, whether Task 1 has tests, and whether to drop Instagram handles. The spec says v1 ignores them but does not remove them.
- The 2026-09-30 `SESSION_SUMMARY.md` is unchanged. No pull request is open.

## Open questions

1. **For India:** are the new decisions 22 to 26 okay?
2. **For India:** what slices will the work be split into, so the known gaps can be assigned?
3. **For Amanda:** should the pasted website-test notes and the feed-count update go into the spec once re-checked?

## Update, 2026-10-14

- All work now lives on one branch, `main`. It holds `SPEC.md` and both session summaries.
