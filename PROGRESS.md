# Progress Log

This file is a simple diary of what has been built. It is written for someone who does not write code. No tech words, please.

## How to read it

Newest entries go at the bottom. Each entry answers four questions:

- **What got done:** in everyday words.
- **What you can see or try:** what looks different now, if anything.
- **What is still waiting:** anything unfinished or blocked.
- **Needs from Amanda:** anything only you can do. Write "Nothing" if there is none.

## Format for each entry

Copy this and fill it in:

```
### [Date] · Issue [number]: [short name]
**Status:** Done / Partly done / Stuck

**What got done:**
- (one plain sentence per item)

**What you can see or try:**
- (or "Nothing visible yet")

**What is still waiting:**
- (or "Nothing")

**Needs from Amanda:**
- (or "Nothing")
```

## Log


### 2026-10-14 · Issue 1: Password page and event cards
**Status:** Done on my side. Not live on the internet yet (needs you, see below).

**What got done:**
- Built the password page. Without the password, nobody can see the events.
- Built the part that reads the Toronto Event Generator list and keeps only the events Misha starred.
- Built the event cards. Each one shows the date, title and tags, with a grey box where the picture will go.
- A multi-day event shows up as one card. Cards are in date order, soonest first.
- The top of the page says how many events were found. If there are none, it says so in plain words.
- Wrote 42 automatic checks first, then built the pieces until every check passed. I also ran the real tool against the real list. For today through 14 days from now it found 13 events, and an independent count gave the same number.

**What you can see or try:**
- Not yet. It only runs inside my workspace until it is put on Vercel.

**What is still waiting:**
- The tool is not on Vercel yet.
- The checklist item "Amanda has opened the live address and logged in" cannot be ticked until then.

**Needs from Amanda:**
- Create the Vercel project from this GitHub project.
- In Vercel's settings, add a setting called TEG_PASSWORD and give it the password you choose. Do not type the password into any file or message.

### 2026-10-14 · Issue 2: Pictures fill in (earlier entry, replaced by the next one)
**Status:** Out of date. This was written while issue 2 was paused. Issue 2 was finished afterwards, so read the next entry instead.

**What got done:**
- Nothing built yet.
- Checked a Vercel limit I was told to check first. Vercel will not send back anything bigger than 4.5 MB in one go. Our plan allows pictures up to 8 MB.

**What you can see or try:**
- Nothing visible yet.

**What is still waiting:**
- A decision on picture size. In simple terms: if a picture is bigger than 4.5 MB, our tool could not pass it along, so that card would show the event link and the paste box instead of a picture. Pictures are not shrunk. Most event pictures are well under this size.
- The three files from the earlier project (extractor.ts, imageFetch.ts, types.ts). They are not in this GitHub project, and the plan says to copy them exactly as they are.

**Needs from Amanda:**
- Say what picture size limit to use (I suggest 4 MB).
- Add the three earlier-project files to this GitHub project so I can use them.

### 2026-10-14 · Issue 2: Pictures fill in
**Status:** Done on my side. Not live on the internet yet (same Vercel step as issue 1).

**What got done:**
- Used the three files you uploaded. The picture-finding code is copied from the earlier project with only the two changes the plan allows (it now uses our one shared picture check, and it stops reading a web page after 2 MB). I moved the files into the project's code folder.
- Built one shared safety check for every web address and picture. It refuses addresses that point inside our own servers, refuses anything that is not really a picture, refuses pictures over 8 MB, and gives up after 8 seconds.
- Built the picture relay, so pictures always come to your browser through our own tool and never straight from the event's website.
- Cards now show a picture when one is found. If none is found, the card shows a link to the event page. The top line reads like "13 events found · 12 images loaded".
- Pictures are looked up 5 at a time, so they appear one by one.
- Kept the 8 MB limit, as you chose. Vercel will not send back more than 4.5 MB in one normal go, so the relay sends pictures in a stream instead, which Vercel says has no such limit. I tested this on my side with a real 5.5 MB photo and it worked. It still needs one check once the tool is on Vercel.
- If your browser cannot show a picture for any reason, the card quietly switches to the event link.
- Wrote 147 automatic checks in total across issues 1 and 2, all passing. I also ran it for real in a browser against the live list. For today through 14 days out, 13 events appeared and 12 found a picture. The one without a picture shows the event link.

**What you can see or try:**
- Not yet on the internet. Once it is on Vercel, log in and watch the pictures appear.

**What is still waiting:**
- After it is on Vercel, someone needs to check that a picture between 4.5 MB and 8 MB still shows (the Rom event's photo is about 5.5 MB and is a good test).
- A small gap, written into the plan's open items: when the tool opens an event's web page, it follows that page's redirects without checking each stop. Fixing it needs a third change to the copied picture-finding code, so I left it for you to decide.

**Needs from Amanda:**
- Say whether to close the small redirect gap above. I suggest yes, later.

### 2026-10-14 · Issue 3: Retry and remember found pictures
**Status:** Done on my side. Not live on the internet yet.

**What got done:**
- Added a "Retry failed images" button. It only tries again for cards that have no picture. It does not touch cards that already have one or are still being looked up. The button disappears when nothing is missing.
- Pictures that were found are remembered in your own browser, saved under the event's web address. After you reload the page, those cards show their pictures straight away, with no new lookups. A failed lookup is never remembered, so it is always tried again.
- If your browser will not let the tool remember things, the tool still works. It just looks every picture up again each time.
- If a remembered picture later stops loading, the tool forgets it, treats the card as missing a picture, and the Retry button can fix it.
- Nothing is stored on our side. Everything remembered lives in your own browser.
- Fixed a bug my own checks found while building this: after a successful retry, a card could keep hiding its new picture.
- Wrote 34 more automatic checks (181 in total), all passing. In a real browser against the live list, the Retry button appeared for the card with no picture, and a reload only looked up the cards that had no remembered picture.

**What you can see or try:**
- Not yet on the internet. Once it is: reload the page and the pictures show instantly. A card with no picture has a Retry button above the cards.

**What is still waiting:**
- Putting it on Vercel (see issue 1).
- The plan's issue 3 asks me to confirm how to read "keyed by event URL plus cache headers". I read it as: remembered in your browser by event address, plus a standard "may keep this" label on found results from our server. Tell me if you meant something else.

**Needs from Amanda:**
- Approve fixing one of my own earlier checks. It is the issue 1 check "rejects a tampered cookie". About 1 time in 16 it wrongly fails, because of how it scrambles the login cookie. The tool itself is fine. The rule is that I need your approval to change a saved check. The fix is to scramble the cookie in a way that always changes it.
- Create the Vercel project and set the TEG_PASSWORD setting (from issue 1), so you can see all of this live.

### 2026-10-14 · Follow-ups from your answers
**Status:** Done on my side.

**What got done:**
- Fixed my own flawed check ("rejects a tampered cookie"). It no longer fails by accident. The login itself was never affected.
- Closed the redirect gap. When the tool opens an event's web page, it now checks every stop along the way, so a bad link can no longer send it to something inside our own server. This was a third change to the copied picture-finding code. I wrote the checks first, added the change, and updated the plan (SPEC.md) and CLAUDE.md to say three changes are allowed.
- Wrote 8 more automatic checks (189 in total), all passing.
- You said to carry on with how found pictures are remembered (remembered in your own browser by event address). I did not see a problem with it, so it stays as built.

**What you can see or try:**
- Nothing new on screen.

**What is still waiting:**
- Putting the tool on Vercel. You said later.

**Needs from Amanda:**
- Nothing right now.

### 2026-10-14 · Issue 4: Date pickers and tag filter
**Status:** Done on my side. Not live on the internet yet.

**What got done:**
- Added two calendar pickers, "From" and "To". They start at today and 14 days ahead. The "To" date cannot go past 30 days ahead. If you type a later date, it is pulled back to 30 days. If "To" is before "From", it is set to match "From".
- The "From" date can be any date, even in the past. You did not say otherwise, so I used the plan's default. Tell me if it should be limited to today or later.
- Added tag buttons. They list the tags that appear in the chosen dates, in alphabetical order. Picking several shows events with any of them.
- Picking a tag does not remove the other tag buttons. Changing the dates updates the buttons. A tag you picked that no longer appears is dropped.
- The top line always matches the cards on screen. For example "7 events found · 5 images loaded".
- Newly visible events get their pictures looked up, and ones already looked up are not looked up again. A multi-day event stays one card.
- Wrote the automatic checks first, then built until they passed.

**What you can see or try:**
- Not yet on the internet. I ran it for real in a browser against the live list. Widening to 30 days went from 13 to 18 events. Picking one tag showed 6, and adding a second showed 7.

**What is still waiting:**
- Putting the tool on Vercel (you said later).

**Needs from Amanda:**
- Nothing.

### 2026-10-14 · Issue 5: Select events
**Status:** Done on my side. Not live on the internet yet.

**What got done:**
- Cards with a picture now have a "Select" box. Cards with no picture, or still loading, have no box.
- A line shows the running count, for example "3 selected" or "3 selected (1 hidden by filters)". The part in brackets only shows when something is hidden. There is no limit on how many you can pick.
- Picks are remembered by the event's web address, not by the card. So changing the dates or tags never loses a pick, even for a multi-day event whose card changes.
- Picks hidden by a tag or by a date change stay picked and are counted as hidden.
- If a picked card's picture later stops working, it is quietly unpicked, because it could not be downloaded.
- In the real browser: I picked 3 events, filtered to a tag that hid them, and it said "3 selected (3 hidden by filters)". Clearing the filter brought them back, still picked. Cards with no picture had no box.

**What you can see or try:**
- Not yet on the internet.

**What is still waiting:**
- Putting the tool on Vercel.
- Picks are lost if you refresh the page. That is issue 9.

**Needs from Amanda:**
- Please check on something that happened. While I was working, three test files that I did not write appeared in the project folder: `tests/app/lightbox.test.tsx`, `tests/app/selection.test.tsx` and `tests/lib/window-filters.test.ts`. Two cover issues 4 and 5 and now pass (I matched their wording "From" for the start date). The third is for issue 6 (the larger picture view), which you did not ask me to build, so its 5 checks fail. I did not change or delete any of them, and I left all three out of what I saved to GitHub. Please tell me if they are yours, and whether I should save them.

### 2026-10-14 · Issue 6: Larger picture view
**Status:** Done on my side. Not live on the internet yet.

**What got done:**
- Clicking a card's picture now opens a larger view of it. It closes with the Close button, the Escape key, or a click outside the picture. Clicking the picture itself does not close it.
- Cards with no picture, or still loading, have nothing to click.
- Opening and closing the larger view does not change what is picked or filtered.
- The larger picture also comes through our own picture relay, never straight from the event's website.
- Wrote the automatic checks first, then built until they passed.

**What you can see or try:**
- Not yet on the internet. In a real browser against the live list, clicking a picture opened the large view and Escape closed it.

**What is still waiting:**
- Putting the tool on Vercel.

**Needs from Amanda:**
- Nothing.

### 2026-10-14 · Issue 7: Fix a missing picture by pasting a link
**Status:** Done on my side. Not live on the internet yet.

**What got done:**
- A card with no picture now shows the link to the event page and a box to paste a picture link, with a "Use this image" button.
- The tool checks the pasted link first, using the same checker as everything else (so there are no separate rules). If it really is a picture, it appears on the card, the top counter goes up, and the card can now be picked.
- If it is not a picture, the card stays exactly as it was and a plain message says why. For example: "That link isn't an image (it looks like a web page or another kind of file). Try right-clicking the picture itself and choosing "Copy image address"." The text you typed stays in the box so you can fix it.
- A refused link never undoes a picture you pasted earlier on another card. Links that point to private places, are not web links, are too big (over 8 MB), or take too long are refused the same way.
- A pasted picture is not sent back to the lookup when you press Retry.
- I used a plain text box, not a browser "link" box, so that our own readable message shows instead of the browser's.
- Wrote the automatic checks first, then built until they passed.

**What you can see or try:**
- Not yet on the internet. In a real browser: pasting a web page link, a made-up link and an internal address were each refused with a plain message, and pasting a real picture link was accepted (counter went from 12 to 13 pictures).

**What is still waiting:**
- Pasted pictures are not remembered after a refresh. That is issue 9.

**Needs from Amanda:**
- Nothing.

### 2026-10-14 · Issue 8: Download selected pictures
**Status:** Done on my side. Not live on the internet yet.

**What got done:**
- Added a "Download selected images" button. It is greyed out when nothing is picked.
- One picked picture downloads as one file, named like `2026-10-14_hot-breath-karaoke.png`. Two or more download as one ZIP file called `teg-event-images.zip`, with each picture inside under its own name. Files go to your normal Downloads folder.
- Names are the date, then the title in lowercase with spaces as dashes. Accents and symbols are cleaned up, long titles are shortened, and an empty or all-symbols title becomes "event". The file ending (.jpg, .png, .webp) comes from what the picture really is, not from the link, so a link ending in ".php" is still saved as a proper picture.
- Two events with the same date and title get "-2", "-3" so nothing overwrites anything.
- Picks that are hidden by a tag, or by changing the dates, are still downloaded.
- The ZIP is built right in your browser from pictures fetched through our relay. No server sends a ZIP, so Vercel's size limit does not apply to it.
- If one picture cannot be fetched, the others still download, and a red message names the one that failed. If only one of several works, you get that one as a single file, not a ZIP.
- Pictures only. No list of links.
- Added a small, well-known ZIP-making library (fflate).
- Wrote the automatic checks first (335 in total now, all passing).

**What you can see or try:**
- Not yet on the internet. In a real browser against the live list: one pick downloaded as `2026-10-14_artists-in-the-library-animate-with-16mm-film.png`, and three picks downloaded as a ZIP that opened with three correctly named pictures.

**What is still waiting:**
- Putting the tool on Vercel, then one real check there with a few pictures.
- Closing the page loses your picks. That is issue 9.

**Needs from Amanda:**
- Nothing for the code. The plan did not say how to report a failed download, so I made one small addition to SPEC.md (section 12.9): the tool saves what it can, then names the pictures that failed. Tell me if you want that to work differently.

### 2026-10-14 · Issue 9: Remember picks across refreshes, and Start over
**Status:** Done on my side. Not live on the internet yet.

**What got done:**
- Your picks and any pictures you pasted are now remembered in your own browser. Refresh or close the page and they are still there.
- A "Start over" button clears your picks and your pasted pictures. It does not clear the pictures the tool found by itself, so those still show up straight away after a refresh. The button is greyed out when there is nothing to clear. It does not change your dates or tag filters.
- Pasted pictures come back without being checked again. A card with a pasted picture is not looked up again either.
- If an event has left the TEG list (or is no longer starred), it quietly drops out of your saved picks. A pick for an event outside the dates you are looking at is kept, so changing the dates and back never loses it. It can still be downloaded.
- If your browser will not remember things, or holds scrambled data, the page just loads normally with nothing picked.
- If a remembered picture later stops working, the card goes back to the link and the paste box. The pasted picture is forgotten.
- I used the "open point" from the plan as written: pasted pictures were checked once, and are not checked again on load.
- Wrote the automatic checks first, then built until they passed (372 in total, all passing).

**What you can see or try:**
- Not yet on the internet. In a real browser against the live list: I picked 2, pasted a picture on a third, refreshed, and everything was still there. Start over cleared it, and it stayed cleared after another refresh.

**What is still waiting:**
- Putting the tool on Vercel.

**Needs from Amanda:**
- Nothing. (One small choice I made: an event that Misha un-stars counts as "gone" and drops out of your saved picks, the same as an event that leaves the list.)

### 2026-10-14 · Issue 10: Walkthrough and test record
**Status:** Partly done. This one cannot be finished until the tool is on Vercel and you have tried it.

**What got done:**
- Wrote `TESTING.md` in the project. It has all 15 items from the plan's "done" checklist, each run in a real browser, a table of every one of the 13 starred links in today's dates (not a sample), the success rate by website, failures grouped by cause, and notes on the Vercel size limit.
- Results: 14 of the 15 items passed. The 15th (you using it on your own laptop with no code on your computer) needs you. One part of item 2 cannot be tested: Bad Class: Drake vs Kendrick was on Oct 1, which has passed.
- Picture finding: 12 of the 13 links found a picture. The one that did not is a Toronto Public Library page that has no picture on it.
- Pressed Retry on that real failing card. It tried only that card, it failed again for the same reason, and nothing else changed.
- Refreshed the numbers in the plan (SPEC.md section 8), keeping the old numbers marked as historic.
- Found no product bugs in this walkthrough.

**What you can see or try:**
- Open `TESTING.md` in the project on GitHub.

**What is still waiting:**
- Everything in `TESTING.md` was run on a copy of the finished tool in my workspace, not on Vercel. The plan asks for it to be run on the real Vercel site. That needs the tool put on Vercel first.
- One check only works on Vercel: a picture between 4.5 MB and 8 MB (the ROM event photo is about 5.5 MB). Vercel's size limit might block it. If it does, the card falls back to the link and we lower the limit to 4 MB.

**Needs from Amanda:**
- Put the tool on Vercel: create the Vercel project from this GitHub project, and add a setting called TEG_PASSWORD with the password you choose. I can walk you through it step by step if you say "walk me through Vercel".
- Then open it on your own laptop and try it (checklist item 15). Tell me what you see and I will re-run the 15 items on the real site and update `TESTING.md`.

### 2026-10-14 · Decisions you made, and housekeeping
**Status:** Recorded, so nothing lives only in the chat.

**Decisions you made today:**
- **Picture size limit:** keep 8 MB, as the plan said. (I had suggested 4 MB because of Vercel's 4.5 MB limit. Pictures are sent in a stream to get around it. That still needs one check once the tool is on Vercel.)
- **Redirect gap:** close it now. Done in the follow-ups entry above.
- **My flawed login check:** fix it. Done in the follow-ups entry above.
- **How found pictures are remembered:** you said to carry on as built (in your own browser, by event address).
- **"From" date:** it can be any date, including past days. It stays as built.
- **When a download partly fails:** keep it as it is (option A). You get the pictures that worked, plus a red message naming the ones that failed.
- **Where work is saved:** everything goes straight to the `main` branch on GitHub. The note saying so is the first line of CLAUDE.md.
- **Extractor files:** you uploaded the three earlier-project files, and I filed them in the project's code folder.

**Housekeeping:**
- **Branches:** all the work is on `main`, and `main` matches GitHub exactly. The old branch `claude/practical-dirac-rknumi` is no longer needed and can be deleted. I never touched the branch `claude/teg-event-selector-84ay3j`.
- **Three test files nobody claimed:** while I was working, three automatic-check files appeared in the project folder that I did not write (a larger-picture-view one, and two that overlapped with what I built). You did not know whose they were either. I did not use them or save them to GitHub. I moved them, unchanged, to a temporary folder in my workspace: `/tmp/claude-0/-home-user-tegsocialfeaturedevents/84726ace-9097-57cf-b585-c33962d6018b/scratchpad/unclaimed-tests/`. That folder disappears when this session ends. If they turn out to be someone's real work, say so before then and I will save them.
- **Test counts:** 372 automatic checks, all passing, as of the end of issue 9.
- **Done and pushed:** issues 1 to 9. Issue 10 is partly done (see its entry).

**What is still waiting (summary):**
- Put the tool on Vercel and set the TEG_PASSWORD setting.
- Then you try it on your own laptop, and I re-run the 15-item checklist on the real site and finish issue 10.
- One check on Vercel only: a picture between 4.5 MB and 8 MB.

**Needs from Amanda:**
- Create the Vercel project and set TEG_PASSWORD (say "walk me through Vercel" for steps).
- Try the tool on your own laptop and tell me what you see.
- Tell me soon if the three unclaimed test files are someone's.


### 2026-10-16 · New look from the design file
**Status:** Done and checked. All 382 automatic checks pass and the production build works.

**What got done:**
- The design file is saved in the project at `design/teg-event-picker-design-i.html`, so it lives next to the code.
- The tool now looks like that design: dark teal page with amber accents, the banner at the top, four numbered steps, picture cards with a date badge and a big "+ Pick" button, and the "Your photo wall" panel on the right where picks get pinned as pictures. The Download button lives in that panel.
- The banner photo is saved as a normal picture file (`public/hero.webp`), not packed inside the page.
- The login page matches the new look.
- No existing automatic check was changed. I added 10 new ones for the photo wall and the new look.

**What you can see or try:**
- Open the tool, pick a couple of events, and watch them pin to the photo wall. The × on a pinned picture removes it.

**Small differences from the design, on purpose:**
- The count in the photo wall says "2 selected", not "2 picked", and keeps the "hidden by filters" wording. The existing checks need that wording.
- Dates also exist as hidden text in the 2026-10-15 form for the same reason. What you see is the design's "THU OCT 15".
- "Retry failed images" only shows when something has failed (the design always showed it).
- The design has icons for 8 tags. The real feed has five more, which now have icons too: games (game controller), intimacy (heart), nerdy (glasses), outdoors (mountain and sun), talky (loudspeaker). Any future tag with no icon gets a small dot.
- Fonts come from Google Fonts. If they can't load, the page falls back to a plain font.
- Phone layout is still not a goal (desktop only).

**What is still waiting:**
- Vercel setup, and re-running the 15-item checklist on the real site (see the entries above).

**Needs from Amanda:**
- Nothing. You decided to keep "selected" (2026-10-16).

### 2026-10-16 · Change request: event titles are links
**Status:** Done

**What got done:**
- The title on each main card is now a link to that event's page, and it always opens in a new tab.
- Clicking a title only opens the page. It does not pick the card or enlarge the image.
- Titles in the photo wall are unchanged, as you asked.

**What you can see or try:**
- Click any event title on a card. The event page opens in a new tab and your picks and filters stay as they were.

**What is still waiting:**
- Nothing

**Needs from Amanda:**
- Nothing

### 2026-10-16 · Check: starred events missing from the tool
**Status:** Done (answer found, nothing to fix in the tool)

**What got done:**
- Looked into why two starred events did not show up for Oct 19 to Oct 26: IRID Community Dinner #1 "On Learning" (Oct 21) and Disco Descendants Halloween Family Rave (Oct 25, first thought to be Oct 28).
- Found that neither event is in the Toronto Event Generator list that the tool reads. That list says it was last updated on Oct 11, and the events were most likely added or starred after that. This is a likely cause, not a confirmed one.
- The tool itself is working as designed: it shows every starred event the list contains.
- Wrote a short email to India asking whether she knows how the list gets updated. India cannot change the list. Misha can.
- Housekeeping: confirmed everything is on the main branch, and from now on work is pushed to main only.

**What you can see or try:**
- Nothing new in the tool. Once the Toronto Event Generator list is republished with the stars on, both events should appear by themselves, with no change to the tool.

**What is still waiting:**
- Finding out how the Toronto Event Generator list gets updated (automatic, or something Misha triggers), and getting it republished.
- Then re-checking that both events show up.

**Needs from Amanda:**
- Send the email to India, and bring the missing events to Misha so the list can be republished.

### 2026-10-21 · Fix: missing weekly events (Hot Breath Karaoke)
**Status:** Done

**What got done:**
- Found why Hot Breath Karaoke on Oct 28, Nov 11 and Nov 18 were missing: the tool treated every event with the same website link as one event and showed only the first date.
- Weekly, every-two-weeks, monthly and yearly events now get a card for each date, and you can pick each date on its own.
- Other events that share a link, such as the days of a festival, still show as one card, now listing all their dates (for example "Sat Nov 7 – Sun Nov 8").
- Updated SPEC.md (decision 7 and the related lines) and the matching tests, with your approval.

**What you can see or try:**
- Hot Breath Karaoke shows as a separate card for each Wednesday in the date range. Widen the range to see Nov 11 and Nov 18.

**What is still waiting:**
- Picks saved in the browser before this change for a weekly event may be dropped once, because they are now saved per date.
- No festival is starred in the feed right now, so the "one card, several dates" case is tested only with test data.

**Needs from Amanda:** Nothing

### 2026-10-23 · Plan: social media images (issues 11 to 17)
**Status:** Planned. Nothing built yet.

**What got done:**
- Worked out, with you, how the tool will also make the finished Instagram and TikTok images, not just download the event pictures.
- Added the plan to SPEC.md: what the feature does, your decisions (28 to 45), the slide measurements (section 13) and the new parts of the tool.
- Added seven new issue files (11 to 17) and listed them in the issues table.
- Nothing in the tool itself has changed.

**What you can see or try:**
- Nothing visible yet.

**What is still waiting:**
- Building issue 11 (the first Instagram slides). It starts only when you say go.
- The measurements in section 13 are starting values. We adjust them in the live tests at the end (issue 17).

**Needs from Amanda:**
- A go-ahead to start issue 11.
- Later, in issue 17: a private TikTok test post, an Instagram story test with the link sticker, and trying one layers download in Canva.

### 2026-10-23 · Issue 11: Instagram slides, filled in automatically
**Status:** Done

**What got done:**
- Added a "Make social images" button under your photo wall. It opens a window with an Instagram tab.
- The window shows one finished Instagram slide for each event you picked, soonest first: the lab background, the "Upcoming events from our calendar..." box, the event picture in its own shape, and a box with the date and title (for example "Oct 28 - Brains and Barstools...").
- "Download finished images" saves all the slides in one ZIP, named with Instagram, the date and the title.
- "Download event images" in the same window still saves the original pictures, exactly as before.
- The dates follow your rules: "Oct 21", "July 1-3", "July 1, 4, 6", and "Sept" for September.
- If a long title makes the box run into the space kept for the link sticker, the slide shows a warning.
- Tested the whole thing in a real browser against the live events. The three slides and the ZIP came out right.

**What you can see or try:**
- Pick a few events, press "Make social images", and look at the slides. Then press "Download finished images" and open the ZIP.
- Nothing can be edited yet. That is the next piece (issue 12).

**What is still waiting:**
- Editing the slides (issue 12), then remembered edits, TikTok, and the Canva layers.
- The lab background lives in the project and sits behind the password like the rest of the site (I checked, and I had it slightly wrong earlier when I said it would be open).

**Needs from Amanda:**
- Try it on real events and tell me if anything looks off (spacing, text size, the order). Issue 12 starts when you say go.
