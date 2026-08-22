# DFD measurement checklist (owner)

**Time budget:** about **5–10 minutes** per checkpoint.  
**Fill:** [DFD-LAUNCH-SCORECARD.md](./DFD-LAUNCH-SCORECARD.md)  
**Cadence:** Day **3 · 7 · 14 · 30** after Video #1 public (or library launch if you prefer that Day 0).

Do not invent numbers. If a screen has no data, write `n/a` or leave blank.

---

## Before you start (once)

1. YouTube Studio → channel that owns Video #1 (`ue74ge9Bz7U`).
2. Google Search Console → property for `waypointstudio.org` (domain verified).
3. Optional: analytics tool that consumes Waypoint `DFD_*` events — if none, skip Waypoint rows or note `unavailable`.

---

## YouTube Studio (Video #1 only until #2 is public)

**Path:** YouTube Studio → **Content** → open Video #1 → **Analytics**.

Copy into the scorecard (same date range for the checkpoint, e.g. “lifetime to date” or “last 7 days” — note which):

| Grab | Where |
| --- | --- |
| Impressions | Reach / Impressions |
| Views | Overview |
| Impressions CTR | Reach |
| Average view duration | Engagement |
| Average percentage viewed | Engagement |
| Retention / drop-offs | Engagement → audience retention (note first big cliff) |
| Traffic sources | Reach → traffic source types (top 2–3) |
| Subscribers gained | Overview / contributors (as labeled) |
| External traffic | Traffic sources → External (if present) |

**Screenshot (optional, one):** Overview or Reach panel is enough.

**Do not** change title/thumb mid-checkpoint unless you are deliberately testing packaging — if you do, note the date in the scorecard.

---

## Google Search Console

**Path:** Search Console → property `waypointstudio.org`.

Filter or focus on Deep Forest Dispatch when the UI allows (page prefix):

`https://waypointstudio.org/deep-forest-dispatch/`

| Grab | Where |
| --- | --- |
| Indexed DFD pages (approx.) | Pages / indexing — count URLs under `/deep-forest-dispatch/` if listed, or note “unknown / lag” |
| Impressions · Clicks · CTR | Performance → Search results (date range = checkpoint window) |
| Queries | Performance → Queries (top few with impressions) |
| Pages | Performance → Pages (DFD URLs with impressions) |
| Average position | Performance — **only** if impressions are not tiny; else skip |

**Screenshot (optional, one):** Performance chart with DFD page filter, or top queries.

---

## Waypoint / DFD (if measurable)

If your analytics consumer records the hooks:

| Event | Scorecard row |
| --- | --- |
| `DFD_LIBRARY_VIEW` | Library views |
| `DFD_STORY_VIEW` (Mount Hood vs others) | Story views |
| `DFD_RELATED_STORY_CLICK` | Related-story clicks |
| `DFD_WAYPOINT_TOOL_CLICK` | Tool clicks |
| `DFD_VIDEO_PLAY` / `DFD_YOUTUBE_CLICK` | Plays/clicks from Waypoint |

If **no consumer**: write `unavailable` — do not guess from memory.

**YouTube → Waypoint:** check GSC or analytics for youtube.com / youtu.be referrers to Mount Hood or the library. If nothing shows, write `not identifiable`.

---

## Checkpoint routine (copy/paste)

```text
Checkpoint: Day __   Date: ____   Range used: ____

YouTube #1: impressions __  views __  CTR __  AVD __  % viewed __
Retention note: ____
Sources: ____
Subscribers: __   External: __

GSC DFD: impressions __  clicks __  CTR __
Top queries: ____
Top pages: ____
Indexed (approx): __

Waypoint: library __  Mount Hood __  other stories __
Related __  tools __  YT from WP __  YT→WP __
```

Paste into the matching Day table in the scorecard (or keep this block in a note and transfer later).

---

## Video #2 (reminder)

- Recommended publish window: **~3–5 days after Video #1** — see scorecard “Video #2 release plan”.
- **Do not publish** from this checklist alone; owner decides the day.
- After #2 is public, add its Studio numbers at later checkpoints; wire the Lençóis story only after you have the real video ID.

---

## Day 30

After filling the Day 30 table, mark **KEEP / ADJUST / PIVOT** using the scorecard framework.  
One soft video or quiet search week ≠ pivot.
