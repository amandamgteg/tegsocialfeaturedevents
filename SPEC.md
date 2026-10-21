# TEG Social Event Picker: v1 Spec

Status: draft for confirmation. Source tags: **[client]** Amanda's decision in the grill, **[API]** how the live feed behaves, **[code]** what the Task 1 image code does, **[brief]** India's pre-grill brief.

## 1. Problem statement

Each week Amanda needs to choose a handful of events from the Toronto Event Generator (TEG) to post on TEG's social accounts. The events Misha has starred live in a public feed, but the feed has no pictures. To choose, Amanda currently has to open each event's page and look for an image by hand. That is slow, and it is the step this tool removes.

The tool shows every starred event in a date window as a card with its picture. Amanda picks the ones she wants and downloads the images.

This is a co-build. India guides, Amanda builds v1, and Amanda has never built an interface. Her time is limited. She does not want code kept on her own drive, so the work happens in Claude Code on the web and is pushed to GitHub. **[brief]**

## 2. What the tool does

1. Reads the public TEG events feed and keeps only events Misha has starred. **[API, client]**
2. Shows those events, within a date window, as cards with date, title, tags and an image. **[client]**
3. Finds each event's image automatically from the event's own web page. **[brief, code]**
4. Lets Amanda filter by date and by tag, select any events she likes, and download the selected images. **[client]**
5. Lets Amanda fix a missing image by pasting a link to one. **[client]**

It sits behind one shared password and is used in a desktop or laptop browser. **[client]**

## 3. What the user can do, step by step

1. **Open the tool** at its web address and enter the shared password.
2. **See the starred events.** Cards appear straight away, with placeholders where images are still being found. Images fill in as they are found, and a line at the top counts up, for example "12 events found · 9 images loaded".
3. **Change the date range** with two calendar pickers. The default is today through 14 days ahead. She can go up to 30 days ahead.
4. **Filter by tag.** The options are the tags that appear in the current date window's results. If she picks more than one, an event shows when it has any of them. The counter changes to match what is on screen.
5. **Look closer.** Clicking an image opens a larger view.
6. **Select events.** She can select as many as she likes. A running count shows how many are selected, and how many of those are hidden by the current filters.
7. **Fix a card with no image.** Cards with no image show a link to the event page and a box to paste an image link. The tool checks the pasted link is really an image. If it is not, it says so and the card stays as it was. Cards with no image cannot be selected until one is found or pasted.
8. **Retry.** A "Retry failed images" button tries again for cards still missing an image.
9. **Download.** One selected image downloads as that image. Two or more download as a ZIP. Files are named with the event date and title, such as `2026-10-07_tinker-tuesday.jpg`, and go to her normal Downloads folder.
10. **Come back later.** Closing or refreshing the page keeps her selections and pasted images. A "Start over" button clears them. Events no longer in the feed drop out of her saved picks.

Cards are sorted soonest first. An event the feed marks as repeating (weekly, biweekly, monthly or annual) gets its own card for each date, and each can be selected on its own. Any other events sharing a link, such as the days of a festival, appear as one card listing every date in the window, sorted by the first of them. Consecutive days read as a range ("Sat Nov 7 – Sun Nov 8"), others as a list. If there is nothing to show, the page shows a plain empty message.

## 4. Decisions and why

| # | Decision | Why | Source |
|---|---|---|---|
| 1 | Only events Misha starred appear. Auto-starred events count the same, with no badge. | The feed marks all 32 auto-starred events as starred too. Amanda doesn't need to tell them apart. | client, API |
| 2 | "Event type" means the feed's tags. Multiple tags match ANY. Confirmed final by Amanda, with no check with Misha needed. | It widens the list when she picks more tags, instead of quickly emptying it. | client |
| 3 | Tag options are the tags in the current date window's results, worked out before any tag is picked. They stay the same while she picks tags and change only when she changes the dates. | She never picks a tag that returns nothing, and picking one tag doesn't remove the others. This replaced her first answer of "all 12 tags, always". | client |
| 4 | Default window is today to +14 days, extendable to +30. | Two weeks is how far ahead she usually posts. The brief said 30 days. | client, brief |
| 5 | "Today" is the real current date in her browser. An event is upcoming if its date is in the window. | The feed's own "today" is the day it was last rebuilt (2026-09-27, three days old on the day we checked). The feed's `past` marker is also unreliable (see section 8). | client, API |
| 6 | Cards show date, title, tags and image. No description, time or venue. | Keeps v1 to what she needs to choose by picture. It also avoids the question of Misha's first-person wording with occasional profanity. | client |
| 7 | A repeating event (feed `recurrence` is weekly, biweekly, monthly or annual) gets one card per date. Any other events sharing a link get one card listing all their dates in the window. | Each week of a series is a stand-alone event she may want to post. The days of a festival are one event she should see and select once. Changed 2026-10-21 after Hot Breath Karaoke dates were missing. | client |
| 8 | Selection has no limits, only a visible count. | Her call. This replaced the brief's 3 to 5. | client, brief |
| 9 | Selected events hidden by a filter stay selected and are still downloaded. The count says how many are hidden. | Lets her change filters without losing picks. | client, brief |
| 10 | Selections and pasted images are remembered across refreshes, with a "Start over" button. | A refresh shouldn't lose her work. | client |
| 11 | The download is images only. No list of links. One image downloads as the image. Two or more download as a ZIP. | Her call. This replaced the brief's images plus link list. | client, brief |
| 12 | Files go to her normal Downloads folder. | Her "no files on my computer" rule covers the code and repo, not the downloaded images. | client |
| 13 | Files are named date plus title. | She can tell the files apart and they sort in order. | client |
| 14 | Images are found by the Task 1 image finder, for every starred event in the window, not only her picks. | She needs to see all the options before choosing. The feed has no images. | brief, code |
| 15 | Cards with no image cannot be selected. She can paste a replacement link, which is checked first. | Nothing without a picture can end up in the download. The checking fixes a Task 1 bug where a bad pasted link counted as resolved. | client, code |
| 16 | Images are shown to her through our own server. | An image can pass the server's check and still fail to show in her browser if the source site blocks outside display. Loading through our server avoids that. | client (approved) |
| 17 | The counter follows what is on screen. | Her call. | client |
| 18 | Hosted on Vercel, linked to the GitHub repo, with one shared password stored as a hosting setting and not in the repo. Amanda sets the password and decides who gets it. | Simple for someone new to building. Every push updates the live site. She chose a password rather than an open link. | client (approved) |
| 19 | No sample or test data mode. We test against the real feed. | The live feed has upcoming starred events, so there is real data to test with. | client |
| 20 | Desktop or laptop browser is the target. | Her stated device. | client |
| 21 | No "confirm before posting" reminder and no "feed last updated" line. | She doesn't want them. This overrides the brief. Consequence: a star Misha adds midweek may not show until the feed's Sunday rebuild, and the page won't explain why. | client, brief |
| 22 | One API call per event card (one per event link, as in decision 7). The browser runs about 5 calls at a time. | The Task 1 finder only returns after it has finished every event it was given (`extractor.ts:279-348`), and it handles them one at a time (`:282`). One call per card lets images fill in as they are found (section 3, step 2) and keeps each call short. | client, code |
| 23 | Resolved image URLs are cached in the browser, keyed by event URL plus cache headers. No server store. | Keeps v1 simple: nothing to host or clean up on the server. | client |
| 24 | The image proxy and the pasted-link checker both require an `image/*` Content-Type, a size cap, a timeout, and refuse private IPs and non-http(s) URLs. For v1: size cap 8 MB, timeout 8 seconds. | Closes three gaps in the Task 1 code: a missing Content-Type is accepted by the extractor's check (`extractor.ts:210-211`), the extractor has no size limit, and nothing blocks private addresses or non-web links. The 8 MB and 8 s values are the defaults already in `imageFetch.ts` (`:1`, `:45`). | client, code |
| 25 | The extractor is copied from Task 1, not rewritten. The two separate image checks are consolidated into one shared check used by the finder, the proxy and the pasted-link checker. | Keeps the finder's behaviour the same as Task 1. The two existing checks follow different rules (`extractor.ts:236-258` against `imageFetch.ts:41-98`), so an image can pass one and fail the other. | client, code |
| 26 | An adapter converts each feed event into the extractor's seven-field input and passes the results back in the shape the cards need. The fields and their sources are in section 10. | The feed's field names differ from what the extractor expects (`types.ts:1-9`). | client, code |
| 27 | Module boundaries are as in section 12. The shared image check lives in the URL safety validator module. The ZIP is built in the browser from images fetched through the image proxy. The feed is fetched by our server, not the browser. | One image check is needed (decision 25) and a separate module would add nothing. A browser-built ZIP never passes through a Vercel response, which sidesteps the open size-limit question. Whether the feed allows browser requests (CORS) is untested, so server-side is the safe default. | client |

## 5. Out of scope for v1

- Any event description text, in either version.
- Time, venue, price or address on cards.
- A list of links in the download.
- Selection limits, and any warning about how many are selected.
- A reminder to confirm details before posting.
- A "feed last updated" line.
- Sample or fake data, or a development-only switch.
- Signing in with Google or any per-person accounts.
- A layout designed for phones.
- Uploading the download to a cloud folder.
- Distinguishing auto-starred events from hand-picked ones.
- Anything that changes the TEG feed itself. The tool only reads it.

## 6. How we'll know v1 is done

v1 is done when Amanda, on her own laptop, can do all of this against the live feed:

1. Open the tool's web address, and only get in with the shared password.
2. See cards for the starred events in today through +14 days, including Bad Class: Drake vs Kendrick on Oct 1 (present in the feed on 2026-09-30).
3. See cards appear at once and images fill in, with the counter updating as they do.
4. Change the dates, and see the list and counter change.
5. Filter by tag and see the list and counter match, with multiple tags matching ANY.
6. Click an image and see it larger.
7. See a multi-day event as a single card.
8. See a link and a paste box on a card with no image, paste a real image link and see it accepted, and paste a non-image link and see it refused.
9. Find that cards with no image cannot be selected.
10. Use "Retry failed images".
11. Select events, change filters and see the selection survive, with hidden selections counted.
12. Refresh the page and keep her selections and pasted images, then clear them with "Start over".
13. Download one image as a single file and two or more as a ZIP, with date-and-title file names.
14. See the plain empty message when a chosen window has no starred events.
15. Do all of this without keeping any code on her own drive.

## 7. Deferred to a later version

Things we discussed and deliberately left out, so they aren't lost.

**Things she might want later**
- Description text on cards or in posts. We didn't decide between Misha's first-person `description` and the neutral `descriptionOriginal`, which only some events have.
- A list of event links in the download, as the brief originally asked. We discussed title, date and link, and links only.
- A limit or warning on selecting 3 to 5 events, as the brief originally asked.
- A "confirm against the event link before posting" reminder, because the feed is AI-generated and can be wrong about dates, prices, venues and cancellations.
- A "feed last updated" line, to explain why a midweek star hasn't appeared.
- A badge for auto-starred events.
- Matching ALL selected tags instead of ANY.
- Preset date buttons such as Next 7, 14 and 30 days.
- Grouping cards by week.
- Phone-friendly layout.
- Sending the download to a cloud folder instead of the computer.
- Google sign-in or separate accounts instead of one shared password.
- A sample-data mode for testing and demos when nothing is starred. This matters if Misha goes a couple of weeks without starring anything, as happened in the past.

**Known limits to revisit**
- Some events (Instagram and Google Calendar links, for example) will never yield an image. The tool only offers the link and the paste box.
- Image finding can't read pages that build their content with JavaScript, and it has no measured success rate by website yet.

**Still to confirm or check**
- Whether this session's environment can reach the event websites themselves is unknown. The feed address is allowed, but event sites haven't been tested. Real image-finding tests need that.
- The live feed has two fields the brief doesn't mention (`overlay` and `cap`, which look like admin statistics). They are ignored for now.

## 8. Live feed facts checked on 2026-09-30

*Historic: these are the numbers from 2026-09-30 and are kept as a record of the first check. A refreshed set from 2026-10-14 follows below, and `TESTING.md` has the full test record.*

- The feed was built on 2026-09-27 and covers 2026-08-30 to 2026-11-08, with 1,288 events.
- 96 events are starred (76 by hand and 20 automatically, per the feed's own summary). The brief said 49.
- 46 starred events are dated 2026-09-27 or later, on 39 different event links. 36 of them are dated 2026-09-30 or later. About half are weekly series such as Tinker Tuesday, Hot Breath Karaoke and Curiosity Café.
- The brief says upcoming means `past === false`. In the live feed, `past` is either `true` or missing, and is never `false`. Using the brief's rule would show no events at all. That is why decision 5 uses dates.
- For the default window (2026-09-30 to 2026-10-14), there are 28 starred events on 25 different event links. That is inside the brief's estimate of 10 to 30.

**Refreshed on 2026-10-14** (feed built 2026-10-11, covering 2026-09-13 to 2026-11-22):
- 1,533 events, of which 87 are starred (`featured` still matches `misha-star` exactly). The `past` field is still `true` or missing, never `false`, so dates are still the right test.
- For the default window (2026-10-14 to 2026-10-28) there are 15 starred events on 13 different event links. 12 of the 13 links gave an image. See `TESTING.md`.
- 73 different links are starred across the whole feed.
- The feed still has the extra `overlay` and `cap` fields. We ignore them.

## 9. Reused from Task 1

Source: the three Task 1 files `extractor.ts`, `imageFetch.ts` and `types.ts`, read on 2026-10-09. Line numbers below refer to those files. The rest of the Task 1 repo, including its adapter, has not been seen.

**Copied as-is (decision 25)**
- `extractImagesAndHandles()` and its helpers (`extractor.ts`): the order it looks for an image (the event's embedded image, then the preview image (og:image), the Twitter preview image, JSON-LD images, then `<img>` tags), the rules for skipping logos and small images, and the failure reasons.
- `EventItem` and `ExtractionResult` (`types.ts`).
- `fetchImageBuffer()` and `extensionForImage()` (`imageFetch.ts`) as the base for the image proxy and the downloads.

**Changes**
- The two image checks are merged into one shared check (decision 25). It rejects a missing Content-Type, enforces the size cap and timeout, and refuses private IPs and non-http(s) URLs (decision 24).
- The finder is called once per event card, about 5 at a time from the browser, not once for the whole list (decision 22).
- A new adapter sits in front of the finder (decision 26, section 10).

**Excluded, and why**
- The Task 1 adapter: not seen, and it was written for the newsletter, not the TEG feed.
- The rest of the Task 1 repo, including the newsletter parser: not needed. `types.ts` imports nothing from it.
- Instagram handles: the finder still produces them, because the extractor is copied as-is, but the cards do not show them (section 3), so v1 ignores them.
- `mishaHosted`: the extractor never reads it (see section 10).

## 10. Adapter field mapping (decision 26)

Feed fields were checked against the live feed on 2026-10-09. The adapter sends one item per event card (one per event link). "No match" means the feed has no matching field. Amanda settled how to fill each one on 2026-10-09.

| Extractor field | Feed field | How it is filled |
|---|---|---|
| `id` | `id` | The feed's `id`. Each feed event has its own `id`, and a multi-day event has one per day. The card uses the `id` of its first date in the window (the same date used to sort cards, section 3). A repeating event has one card, and so one `id`, per date. |
| `title` | `title` | The feed's `title`. |
| `eventUrl` | `url` | The feed's `url`. Every event has one. |
| `eventUrlType` | no match | Always `"external"`. Every starred upcoming link in the feed goes to an outside website. `"internal"` would skip the page fetch (`extractor.ts:284-304`) and fail every event. |
| `embeddedImageUrl` | no match | Left empty. The feed has no image field. The type makes it optional (`types.ts:6`). |
| `sourceUrl` | no match | Set to the event link (`url`). The finder only uses it to resolve an embedded image (`extractor.ts:191`), so with no embedded image it has no effect. |
| `mishaHosted` (seventh field) | no match | Always `false`. The type requires it (`types.ts:8`), but the extractor never reads it. |

**Results.** The finder returns one result per item, in order: `eventId`, `status` (`resolved` or `failed`), and either `imageUrl` or `failureReason`. It also returns `instagramHandle`, which the cards ignore. The adapter passes `imageUrl` or `failureReason` back to the card by `eventId`.

## 11. Known gaps from the Task 1 code review

Each gap is checked against the three files. No slice plan exists yet, so the owning slice for each is still to be assigned.

| Gap | Where in the code | Fix | Owning slice |
|---|---|---|---|
| A missing Content-Type is accepted | `extractor.ts:210-211`, used at `:251`. `imageFetch.ts:61-63` rejects it. | Reject it in the shared check (decisions 24 and 25). | To be assigned |
| No byte limit | The extractor's check never reads the body (`:244-251`), and the page HTML is read in full (`:316`). `imageFetch.ts` has an 8 MB limit. | Size cap in the shared check (decision 24). The page HTML read needs a cap too, with the value chosen when it is built. | To be assigned |
| Validation logic is written twice | `extractor.ts:236-258` and `imageFetch.ts:41-98`, with different timeouts (6 s and 8 s), user agents and strictness. | One shared check (decision 25). | To be assigned |
| Events are processed one at a time | `extractor.ts:282` and `:263`. | One call per card, about 5 at a time (decision 22). | To be assigned |
| No measured success rate | No counting or logging in these files. | Record resolved or failed, and the reason, per website during testing. | To be assigned |
| No saved test examples | Not determinable from these files. | Decision 19 says no sample data, so keep a short written record of which real event links were tested and what happened. | To be assigned |
| The server check can pass while the browser still can't show the image | The check sends no `Referer` and only looks at status and Content-Type. | Show images through our own server (decision 16), using the same shared check (decision 24). | To be assigned |
| The image file name's extension comes from the URL path first, so a link ending in `.php` is saved as `.php` | `imageFetch.ts:29-39` | Use the Content-Type of the checked image first, then fall back to the URL. Proposed, not yet decided. | To be assigned |
| The extractor's GET request never reads or cancels the response body | `extractor.ts:244-251` | Cancel the body once the status and Content-Type are checked. Not tested. | To be assigned |
| "Resolved" only means the link returns an image, not that it is the right one | `extractor.ts:251`, and `<img>` tags with no width or height skip the size filter (`:175`). | No fix in v1. Amanda sees the picture on the card and can paste a replacement (decision 15). | Not applicable |

**Open items**
- Vercel limit, checked 2026-10-14 (issue 2): a Vercel Function cannot send back more than 4.5 MB in one normal response, but streamed responses do not have that limit (Vercel's own docs). Amanda chose to keep the 8 MB cap (decision 24). The image proxy therefore streams the image. This has only been tested locally, where a real 5.5 MB photo came through. It still needs one check on the deployed site, with an image between 4.5 and 8 MB. If Vercel does block it, the card falls back to the event link (a broken image becomes the link) and we revisit the cap.
- Closed 2026-10-14: the extractor's event page fetch now checks every redirect hop (`fetchPage`), as a third documented edit to the copied extractor.
- No slice plan exists, so no gap has an owning slice yet.

## 12. Modules and interfaces

Each module's purpose, public interface, what it hides, and who calls it. Decision 27 settles the placement choices below. Feed field names `date` (a `YYYY-MM-DD` string) and `tags` (an array of strings) were checked against the live feed on 2026-10-14.

Shared types:

```ts
type FeedEvent   = { id: string; title: string; url: string; date: string; tags: string[]; starred: boolean; recurring: boolean };
// date = first date shown, dates = every date shown. key = url, plus "#date" for a repeating event. Selection uses key. (decision 7)
type EventCard   = { id: string; key: string; title: string; url: string; date: string; dates: string[]; tags: string[] };
type ImageResult = { status: "resolved"; imageUrl: string } | { status: "failed"; reason: string };
type DateWindow  = { start: string; end: string }; // YYYY-MM-DD
```

### 12.1 Auth gate
- **Purpose:** Lets people in only with the shared password (decision 18).
- **Interface:**
  ```ts
  verifyPassword(attempt: string): boolean
  startSession(): string                    // value for the session cookie
  isAuthenticated(req: Request): boolean
  ```
- **Hides:** the password setting, how the comparison is done, and how the cookie is signed and expires.
- **Called by:** the login route, and the middleware that guards every page and every `/api/*` route.

### 12.2 Feed client
- **Purpose:** Fetches the TEG feed and returns events in our own shape.
- **Interface:**
  ```ts
  fetchFeed(): Promise<FeedEvent[]>
  ```
- **Hides:** the feed address, its raw field names (`misha-star` becomes `starred`; `featured`, `overlay` and `cap` are dropped), and parse errors.
- **Called by:** the `/api/events` route, so the browser never talks to the feed directly (decision 27).

### 12.3 Date window and starred filter
- **Purpose:** Turns the feed into the cards on screen. Pure functions, with no network.
- **Interface:**
  ```ts
  defaultWindow(today: Date): DateWindow                      // today to +14
  clampWindow(w: DateWindow, today: Date): DateWindow         // max +30
  buildCards(feed: FeedEvent[], w: DateWindow): EventCard[]   // starred only, one per url, earliest date in window, soonest first
  tagOptions(cards: EventCard[]): string[]                    // computed before any tag is picked (decision 3)
  filterByTags(cards: EventCard[], tags: string[]): EventCard[] // match ANY
  ```
- **Hides:** the rules in decisions 1 to 7, including that "today" comes from the browser and that `past` is ignored.
- **Called by:** the page. It is also the easiest module to unit-test.

### 12.4 Adapter
- **Purpose:** Runs the extractor for one card and returns a card-shaped result (decisions 22 and 26).
- **Interface:**
  ```ts
  findImageForCard(card: EventCard): Promise<ImageResult>
  ```
- **Hides:** the seven-field mapping from section 10, that the extractor takes and returns lists, and the `instagramHandle` it produces and we ignore.
- **Called by:** the `/api/find-image` route. The browser calls that route about 5 at a time.

### 12.5 Extractor (copied from Task 1)
- **Purpose:** Finds an event's image from its web page.
- **Interface:** Unchanged from Task 1: `extractImagesAndHandles(items: EventItem[]): Promise<ExtractionResult[]>`, with `EventItem` and `ExtractionResult` from `types.ts`. The exact signature is copied verbatim from the Task 1 file.
- **Hides:** the search order (embedded image, og:image, Twitter image, JSON-LD, `<img>`), the logo and size filters, and the failure reasons.
- **Called by:** the adapter only.
- **Only edits:** its own image check is replaced by a call to `fetchImage` (12.6), the page HTML read gets a size cap (section 11), and the event page fetch becomes `fetchPage` (12.6), which checks the address and every redirect (added 2026-10-14 with Amanda's approval).

### 12.6 URL safety validator and shared image check
- **Purpose:** The one place that decides whether a URL is safe to fetch and whether what comes back is an image (decisions 24 and 25).
- **Interface:**
  ```ts
  assertSafeUrl(raw: string): Promise<URL>   // throws UnsafeUrlError
  fetchImage(raw: string, opts?: { readBody?: boolean }):
    Promise<{ ok: true; contentType: string; bytes?: Uint8Array } | { ok: false; reason: string }>
  ```
- **Hides:** the http(s)-only rule, private and loopback address ranges, DNS lookup, re-checking every redirect, the `image/*` requirement, the 8 MB cap, the 8 s timeout, and the user agent.
- **Called by:** the image proxy, the paste-URL checker and the extractor.

### 12.7 Image proxy
- **Purpose:** Serves event images from our own server so the source site's blocking can't break display (decision 16).
- **Interface:** `GET /api/image?url=...`, implemented as
  ```ts
  proxyImage(rawUrl: string): Promise<Response>
  ```
- **Hides:** the upstream fetch, the headers we send, the cache headers we return, and how errors map to status codes.
- **Called by:** every card `<img>`, the larger view, and the download module.

### 12.8 Paste-URL checker
- **Purpose:** Confirms a link Amanda pasted is really an image (decision 15).
- **Interface:** `POST /api/check-image`, implemented as
  ```ts
  checkPastedImage(raw: string): Promise<{ ok: true; imageUrl: string } | { ok: false; reason: string }>
  ```
- **Hides:** what counts as "really an image". Leaving the card unchanged on failure is the page's job.
- **Called by:** the card's paste box.

### 12.9 Download and ZIP
- **Purpose:** Downloads the selected images as one file or a ZIP (decisions 11 to 13). Runs in the browser (decision 27).
- **Interface:**
  ```ts
  downloadSelected(items: { date: string; title: string; imageUrl: string }[]): Promise<void>
  fileNameFor(item: { date: string; title: string }, contentType: string): string // "2026-10-07_tinker-tuesday.jpg"
  ```
- **Hides:** the slug rules, the file extension (taken from the response Content-Type, which fixes the `.php` gap in section 11), duplicate-name handling, one image versus ZIP, and the ZIP library.
- **Failures (added in issue 8, signature unchanged):** `downloadSelected` still returns `Promise<void>`. If some images can't be fetched, it saves the ones that worked (one file or a ZIP, decided by how many worked) and then throws `PartialDownloadError` with the list of titles that failed, so the page can tell the user. The ZIP library is `fflate`, and the ZIP is named `teg-event-images.zip`.
- **Called by:** the Download button.

### Dependencies

```
page -> 12.3, 12.9
page -> /api/events -> 12.1 -> 12.2
page -> /api/find-image -> 12.4 -> 12.5 -> 12.6
card <img>, lightbox, 12.9 -> 12.7 -> 12.6
paste box -> /api/check-image -> 12.8 -> 12.6
```

### Not modules
The page components, the selection store (decisions 9 and 10) and the browser image cache (decision 23) are UI state, not separate modules.
