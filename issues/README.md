# Issues

Vertical slices of `SPEC.md`. Each one goes through every layer it needs and ends with something Amanda can see on the deployed site. Do them in an order that respects "Blocked by".

| # | Issue | Blocked by |
|---|---|---|
| 1 | Deployed skeleton: password gate, feed, date-window cards with placeholders | none |
| 2 | Images fill in | 1 |
| 3 | Retry failed images and remember found images | 2 |
| 4 | Date pickers and tag filter | 1 |
| 5 | Select events | 2, 4 |
| 6 | Larger image view | 2 |
| 7 | Fix a missing image by pasting a link | 2, 5 |
| 8 | Download selected images | 5 |
| 9 | Remember picks across refreshes, and Start over | 5, 7 |
| 10 | Live-feed walkthrough and test record | 1 to 9 |

```
1 ──┬── 2 ──┬── 3
    │       ├── 6
    │       └────┐
    └── 4 ───────┴── 5 ──┬── 7 ──┐
                         ├── 8   │
                         └───────┴── 9
                  (1 to 9) ── 10
```

Parallel work: after 1, issues 2 and 4 can run side by side. After 2, issues 3 and 6 can too.

## Where the section 11 gaps land

| Gap | Issue |
|---|---|
| Missing Content-Type accepted; no byte limit; validation written twice; server check passes but browser can't show | 2 |
| Events processed one at a time | 2 |
| Bad pasted link counted as resolved | 7 |
| File extension taken from URL path | 8 |
| Extractor GET never reads or cancels the body | 2 |
| No measured success rate; no saved test examples | 10 |
| Vercel response-size limit (open item) | 2 (check), 10 (record) |
