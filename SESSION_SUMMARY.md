# TEG Social Event Picker: Session Summary for India

**Date:** 2026-09-30 · **Who:** Amanda and Claude

## What we did

- Read India's Task 2 brief, then ran a question-by-question grill with Amanda on everything in v1.
- Checked the live events feed against the brief.
- Wrote the v1 spec: `SPEC.md`, pushed to GitHub on branch `claude/teg-event-selector-84ay3j`. It has the problem, what the tool does, the step-by-step use, 21 decisions with reasons, what's out of scope, a "done" checklist, and a separate list of things deferred.
- No code was written.

## Where Amanda changed the brief

- The download is **images only**. No list of event links.
- **No 3–5 selection limit.** Any number can be selected, with a visible count.
- **No "confirm before posting" reminder** and **no "feed last updated" line.**
- The default window is **today to +14 days** (extendable to +30), not 30 days.
- **"Today" is the user's real current date**, not the feed's `today`.
- **No sample-data or test mode.** We test against the live feed.
- A **paste-a-replacement-image-URL** flow is in v1. Pasted links are verified first.
- Access is behind **one shared password**, hosted on Vercel, with images loaded through our own server. Amanda approved these.

## What the live feed showed vs. the brief

- The brief says upcoming means `past === false`. In the live feed, `past` is `true` or **missing**, never `false`. Using the brief's rule shows zero events. The spec uses dates instead.
- 96 events are starred (brief said 49). 28 of them fall in the default window, on 25 different event links.
- The feed has two extra top-level fields, `overlay` and `cap`. We ignore them.

## What didn't work

- **The feed was blocked** by this environment's network policy at first. Amanda allowed it in the environment settings, and it then worked.
- **My first starred-event count was wrong** (I reported zero upcoming, because of the `past` issue above). Amanda spotted a starred Oct 1 event, and I recounted.
- **The GitHub push failed** several times with a 403 until Amanda reinstalled or reconnected the Claude GitHub App. It now works.

## Not done or not verified

- I did not look at the Task 1 repo (`TEG_newsletter_grid`) or test the image extractor. Everything about it comes from the brief.
- I haven't tested whether this environment can reach the event websites themselves, only the feed address. Real image-finding tests need that.
- No pull request is open. The spec is on a branch only.

## Open questions

1. **For Amanda or Misha:** confirm that "event type" means the feed's `tags`, with multiple tags matching ANY. Amanda answered, but the brief flagged it for Misha.
2. **For Amanda:** I assumed the tag filter options come from the date window's results before any tag filtering. She didn't explicitly confirm that.
3. **For Amanda and India:** who sets and shares the shared password wasn't discussed.
4. **For Amanda:** do you want a pull request opened for `SPEC.md`?
5. **For India:** are you okay with the changes above that override your brief?
