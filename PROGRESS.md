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
