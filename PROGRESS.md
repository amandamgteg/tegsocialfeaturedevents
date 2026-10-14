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

### 2026-10-14 · Issue 2: Pictures fill in
**Status:** Not started. Paused on purpose, as you asked.

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

