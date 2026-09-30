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

Cards are sorted soonest first. Multi-day events appear once, sorted by their first date in the window. If there is nothing to show, the page shows a plain empty message.

## 4. Decisions and why

| # | Decision | Why | Source |
|---|---|---|---|
| 1 | Only events Misha starred appear. Auto-starred events count the same, with no badge. | The feed marks all 32 auto-starred events as starred too. Amanda doesn't need to tell them apart. | client, API |
| 2 | "Event type" means the feed's tags. Multiple tags match ANY. Confirmed final by Amanda, with no check with Misha needed. | It widens the list when she picks more tags, instead of quickly emptying it. | client |
| 3 | Tag options are the tags in the current date window's results, worked out before any tag is picked. They stay the same while she picks tags and change only when she changes the dates. | She never picks a tag that returns nothing, and picking one tag doesn't remove the others. This replaced her first answer of "all 12 tags, always". | client |
| 4 | Default window is today to +14 days, extendable to +30. | Two weeks is how far ahead she usually posts. The brief said 30 days. | client, brief |
| 5 | "Today" is the real current date in her browser. An event is upcoming if its date is in the window. | The feed's own "today" is the day it was last rebuilt (2026-09-27, three days old on the day we checked). The feed's `past` marker is also unreliable (see section 8). | client, API |
| 6 | Cards show date, title, tags and image. No description, time or venue. | Keeps v1 to what she needs to choose by picture. It also avoids the question of Misha's first-person wording with occasional profanity. | client |
| 7 | One card per event link. | Multi-day events appear once per day in the feed. She should see and select each event once. | client |
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

- The feed was built on 2026-09-27 and covers 2026-08-30 to 2026-11-08, with 1,288 events.
- 96 events are starred (76 by hand and 20 automatically, per the feed's own summary). The brief said 49.
- 46 starred events are dated 2026-09-27 or later, on 39 different event links. 36 of them are dated 2026-09-30 or later. About half are weekly series such as Tinker Tuesday, Hot Breath Karaoke and Curiosity Café.
- The brief says upcoming means `past === false`. In the live feed, `past` is either `true` or missing, and is never `false`. Using the brief's rule would show no events at all. That is why decision 5 uses dates.
- For the default window (2026-09-30 to 2026-10-14), there are 28 starred events on 25 different event links. That is inside the brief's estimate of 10 to 30.
