# CLAUDE.md

Commit and push directly to main. Don't leave work on other branches.

## What this is

TEG Social Event Picker v1. A small password-protected web tool. It reads the public Toronto Event Generator feed, shows starred events in a date window as cards with images, and lets Amanda select events and download their images. `SPEC.md` is the source of truth. `issues/` holds the build plan, one vertical slice per file. `PROGRESS.md` is the running log.

Amanda has never built an interface and keeps no code on her own drive. All work happens in Claude Code on the web and is pushed to GitHub.

## Stack

- Next.js 15 (App Router) and TypeScript, deployed on Vercel. The spec does not name a stack, so this follows the assumption in `issues/01-deployed-skeleton.md`.
- Vitest for tests, with Testing Library and jsdom for page tests.
- No database. No server-side store. Browser storage only for UI state.
- Password comes from the `TEG_PASSWORD` environment setting. It is never in the repo or in client code.
- Feed: `https://toronto-event-generator.pages.dev/events.json`. The raw star field is `misha-star`. The feed's `past` field is unreliable. Never use it.

## Folder structure

```
SPEC.md            what we are building and why
issues/            vertical slices 1 to 10, with "Blocked by"
PROGRESS.md        log of finished work (format at the top of the file)
reference/         DO NOT TOUCH (see rules)
src/app/           pages and API routes (Next.js App Router)
src/lib/           the modules from SPEC section 12, one file each
src/middleware.ts  thin wrapper that calls the guard in src/lib
tests/             all tests and test fixtures, mirroring src/
```

## Key constraints

- Build only the issue you were asked to build. Respect "Blocked by". Do not start the next issue.
- Modules and their public interfaces are fixed by SPEC section 12. Do not rename or reshape them.
- Every `/api/*` route and every page, except the login page and login route, requires the session cookie.
- "Today" is the browser's date, not the feed's `today`.
- Cards show date, title, tags and image only. No description, time or venue.
- Images shown to the user come through our own `/api/image` proxy, never directly from the source site.
- The image extractor is copied verbatim from Task 1 (SPEC section 9). Do not rewrite it. Only the two documented edits are allowed.
- Never invent sample-data modes in the product (decision 19). Test fixtures belong only in `tests/`.
- Desktop browser only.

## TDD rule

1. Write a failing test first. Run it and see it fail for the right reason.
2. Write the smallest code that makes it pass.
3. Refactor with the tests green.

Do not write implementation code before a failing test exists for it. Use the "Failing tests to write first" list in the issue as the starting point.

## Rules

- Tests and test data live outside your write path. Don't edit them to make a build pass. If a test seems wrong, stop and ask. Once a test is written and committed, changing or deleting it needs Amanda's approval.
- Don't touch `/reference/`.
- If the code and `SPEC.md` disagree, stop and ask. Don't pick one.
- Never skip, disable or loosen a test to get green.
- Do not open a pull request unless asked.

## Commands

```
npm install
npm test          # run all tests once
npm run build     # production build, also run by Vercel
npm run dev       # local dev server
```

## Working notes

- Log finished work in `PROGRESS.md`, in plain language for a non-technical reader.
- If something needs Amanda (Vercel setup, passwords, missing files), say so in `PROGRESS.md` under "Needs from Amanda".
