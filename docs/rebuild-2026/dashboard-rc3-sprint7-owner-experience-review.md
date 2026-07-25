# Dashboard RC3 Sprint 7 — Owner Experience Review

**Status:** Owner Review: **Pending** — **not merged · not deployed**  
**Date:** 2026-07-24  
**Type:** Production-readiness experience review (not a feature sprint)  
**Branch:** `feature/dashboard-rc3-sprint6-functional-catalog`  
**Starting SHA:** `a73fbe0de2471e5f7fb91f1affcff88da1381623`  
**Ending SHA:** `b0b2d447725f50bbd87feb2a60800b842b66314c`  
**Authority:** Product standards · Observe. Discover. Understand. · RC3 Sprint 6 functional catalog  

**Evidence:** Live local Dashboard on Sprint 6 tip + Sprint 6 mobile captures + new Sprint 7 experience captures under `docs/rebuild-2026/dashboard-rc3-sprint7/`.

---

## Executive summary

The Dashboard is **technically much healthier** than the broken production state that triggered Sprint 6: phone tiles are full-width, placeholders are gone, and fifteen live tiles make Customize feel real.

It is **not yet something every outdoor person would open every morning without friction.**

What works: calm dark visual language, honest location/trust chips, Outdoor Score + Daily Brief + Discovery as a real briefing layer, and a working instrument grid once you scroll to it.

What blocks “want to use every day”: **Today Outside is too long and prose-heavy for the first viewport**, so the instruments that answer glanceable questions sit below a dense briefing. Customize leads with **interest profiles** before the tile picker, which confuses first-time users. A few trust contradictions remain (e.g. Excellent score beside Limited confidence). Photography light tiles overlap conceptually.

**Ship recommendation: B — Needs minor polish before merge.**

**Production readiness score: 78 / 100**

---

## Strengths

1. **Purpose is clear within five seconds** — “Today Outside” + place + live facts reads as outdoor briefing, not an admin panel.
2. **Visual language feels premium** — deep navy, restrained glow, serif display titles, calm badges.
3. **Trust vocabulary is mostly honest** — approximate place, Live / Partial / Unavailable, confidence labels, Explain why.
4. **Mobile layout recovery worked** — Sprint 6 captures show consistent full-width cards, no half-width collapse, no Coming Soon tiles.
5. **Instrument tiles answer real porch questions** once visible — Conditions, Hourly, Light, Air, Moon, Rivers.
6. **Intelligence stack is ambitious and on-brand** — Score, Daily Brief, Discovery, Activity Guide extend Observe → Discover → Understand.
7. **Customize Save/Cancel + move controls** are present and touch-reachable on phone.

---

## Weaknesses

1. **First viewport is a newsletter, not a dashboard.** On phone, almost the entire first screen is Today Outside prose (bullets → score → Daily Brief). Workspace tiles begin only after a long scroll.
2. **Scroll fatigue.** Daily Brief + Discovery + Activity Guide + then 6–9 tiles is a lot for a morning glance.
3. **Customize hierarchy is backwards for new users.** Interest On/Off/Up/Down appears first; tile library and reorder controls are below. Users may think interests *are* the dashboard.
4. **“Excellent” + “Limited confidence”** on Outdoor Score reduces trust at a glance.
5. **Repetitive briefing language** — multiple activities “look strong” with similar window phrasing.
6. **Tile category label under every title** (“ENVIRONMENTAL”) duplicates the family header and adds noise.
7. **Photography light stack** (Sunrise/Sunset, Golden Hour, Blue Hour, Photo Conditions) is useful but dense — easy to feel duplicate.
8. **Interest row layout** on phone can wrap unevenly for longer labels (Rivers & Water) — partially mitigated in this review pass.
9. **Loading chip said “Waiting”** — conflicts with Sprint 6 “no Waiting” product language; fixed to “Settling” in this pass.

---

## 1. First impression (5 seconds)

| Question | Assessment |
|----------|------------|
| What does the page communicate? | Outdoor briefing for a place — conditions, score, guidance. |
| Hierarchy obvious? | Partially — Today Outside dominates; instruments are secondary until scroll. |
| Beautiful? | Yes — calm, editorial, premium dark. |
| Premium? | Yes. |
| Trustworthy? | Mostly — approximate + Live help; score/confidence pairing can undercut that. |
| Purpose clear? | Yes: decide how to spend time outside. |

**Verdict:** Strong brand/feel; weak “instrument dashboard” first beat.

---

## 2. Information hierarchy

### Current visual rank (top → bottom, phone)

1. Today Outside summary bullets  
2. Outdoor Score  
3. Daily Brief (Outlook, Opportunities, Watches, Interesting, Take)  
4. Discovery (Sky / Nature / Seasonal / …)  
5. Activity Guide chips  
6. Workspace instruments (Conditions, Hourly, Alerts, …)

### Recommended hierarchy for morning use

1. **Compact Today Outside** (3–5 bullets + score + one-line Take)  
2. **Alerts** (if any)  
3. **Primary instruments** (Conditions, then interest-weighted: Light / Air / Hourly)  
4. **Expandable intelligence** (Daily Brief, Discovery, Activity Guide) below fold or behind “Read the briefing”

### Specific moves

| Item | Recommendation |
|------|----------------|
| Weather first? | Keep Conditions near top of **tiles**; don’t let weather prose dominate entire first screen. |
| Photography higher? | Yes for Photography-interest users (already partly handled by Personal Workspace). Default General: Light after Conditions is fine. |
| Air Quality? | Keep default-on; health-relevant. |
| Astronomy? | Moon default-on is fine; Stargazing optional. |
| Today Outside more prominent? | Make it **shorter and sharper**, not taller. Prominence ≠ length. |

---

## 3. Tile-by-tile usefulness

Scale: **Would I look at this before going outside?** (1–10)

| Tile | Score | Real question? | Notes |
|------|------:|----------------|-------|
| Conditions | **9** | What’s it like right now? | Core. Keep default. |
| Hourly | **8** | What happens in the next few hours? | High value; keep default. |
| Daily | **7** | Today’s range? | Useful; optional default is OK. |
| Alerts | **10** when active / **4** empty | Is it safe? | Must stay; empty state OK if calm. |
| Wind | **7** | Will wind spoil the day? | Strong optional. |
| Rain | **7** | Will I get wet? | Strong optional; overlaps Hourly precip. |
| Air Quality | **8** | Is the air OK? | Keep default. |
| UV Index | **7** | Do I need sun care? | Daytime optional. |
| Sunrise & Sunset | **8** | When does the day bookend? | Keep default. |
| Golden Hour | **6** | When is warm light? | Valuable for photo; overlaps Light. |
| Blue Hour | **5** | When is cool light? | Specialist; keep optional. |
| Photo Conditions | **6** | Is light/atmosphere photo-worthy? | Overlaps Light + Hourly + Air. Consider merge later. |
| Moon | **7** | What’s the night sky like? | Keep default. |
| Stargazing | **6** | Is tonight good for stars? | Overlaps Moon + clouds; optional OK. |
| River Gauge | **6** | What’s the water doing? | Niche but real; keep optional. |

### Merge / simplify candidates (not blockers for merge)

- **Golden + Blue + Photo Conditions** → longer-term “Light windows” tile with sections.  
- **Rain** vs **Hourly precip** → keep both for now; clarify picker copy (“chance + amount” vs “hour-by-hour”).  
- **Moon + Stargazing** → keep separate; picker descriptions already distinguish them.

**Average usefulness of the 15:** ~7.1 — catalog is real, not theatrical.

---

## 4. Customization

| Question | Finding |
|----------|---------|
| New user understand it? | Partially. Interests UI looks like the product. |
| Categories logical? | Weather / Photography / Astronomy / Water / Safety — yes. Interest list (Photography, Hiking, …) is a second taxonomy. |
| Too many / few? | 15 tiles is enough. 10 interests is fine if secondary. |
| Know what each tile provides? | Descriptions exist; not always visible before add on phone without scroll. |

### Suggestions (High / Medium)

1. **High:** Lead Customize with **Tile library** (Add/Hide/Reorder). Put **Interests** in a collapsed “Emphasize what you care about” section below.  
2. **Medium:** Show one-line tile preview (“Temperature, sky, humidity”) beside each picker row.  
3. **Medium:** Default interest = General Outdoors only, already on — reinforce that tiles are the instruments.

---

## 5. Mobile findings

| Check | Result |
|-------|--------|
| Half-width cards | Fixed (Sprint 6) |
| Overlap / clip | Not observed on Sprint 6/7 captures |
| Horizontal scroll | Not observed |
| Spacing / rhythm | Good on tiles; Today Outside too tall |
| Touch targets | Customize Save/Cancel and move buttons adequate |
| Scroll fatigue | **Yes** — briefing before instruments |
| Typography | Readable; serif titles premium |
| Awkward | Interest rows wrapping; ENVIRONMENTAL label redundancy; Customize opens into interests |

Screens: `docs/rebuild-2026/dashboard-rc3-sprint7/01–05-phone-*.png` and Sprint 6 `phone-*-workspace.png`.

---

## 6. Visual polish (subtle only)

| Area | Note | Action |
|------|------|--------|
| Color / glow | Strong, on-brand | Keep |
| Category colors | Useful on tiles | Keep |
| Shadows / borders | Restrained | Keep |
| Icons | Consistent cloud-ish set | Medium: diversify icons per category later |
| Badges | Live / Excellent / Partial clear | Keep |
| Fonts | Display + UI mix works | Keep |
| Noise | Per-tile category string under title | Medium: drop when family header present |
| Interests layout | Long labels wrap oddly | Small CSS fix applied this pass |

**Do not redesign.** Hierarchy compression of Today Outside is the real polish win.

---

## 7. Performance perception

| Feeling | Cause |
|---------|--------|
| “Slow to get to the useful stuff” | Content length, not necessarily network |
| Partial / Settling | Honest; good |
| Instruments settle independently | Good progressive model |

**Improve perceived performance** by shortening first paint content (compact brief) more than by micro-optimizing JS.

---

## 8. Trust findings

| Issue | Impact | Priority |
|-------|--------|----------|
| Excellent score + Limited confidence side-by-side | Confusing / undermines score | **High** — copy clarified this pass |
| “Waiting” chip on loading tiles | Conflicts with no-placeholder language | **High** — renamed Settling this pass |
| Approximate place | Good honesty | Keep |
| Alert unavailable empty state | Acceptable if calm | Keep |
| Estimated vs Live | Need consistent chip discipline | Medium |
| Stale timestamps | Ensure place line always updates | Medium verify |

---

## 9. Compare against vision — Observe. Discover. Understand.

| Pillar | Status |
|--------|--------|
| **Observe** | Instruments exist and are honest — but buried. First screen is interpretation, not observation. |
| **Discover** | Discovery + Educational Moment succeed when reached. |
| **Understand** | Score, Take, Explain why succeed — sometimes too wordy. |

**Missing for daily habit:** a **glanceable observe layer** above the fold (compact facts + 1–2 key instruments), with Discover/Understand available without forcing a long read first.

---

## 10. Final verdict

### Would you ship this today?

**B. Needs minor polish before merge.**

Not **A**, because first-run morning UX still feels like reading a magazine before seeing the instruments, and Customize confuses interests with tiles.

Not **C**, because Sprint 6 fixed release blockers (mobile collapse, placeholders, catalog size). Remaining work is hierarchy/copy/Customize IA — a focused polish pass, not another tile-building sprint.

---

## Recommended improvements (prioritized)

### Critical
_None remaining for layout/placeholders after Sprint 6._

### High
1. **Compress Today Outside first viewport** — 3–5 bullets, score, one-line Take; move full Daily Brief / Discovery below or behind disclosure.  
2. **Reorder Customize** — tiles first, interests second (collapsed).  
3. **Resolve score band vs confidence contradiction** — done partially this pass; verify in hydrated Partial states.

### Medium
4. Soften repetitive “looks strong” activity copy.  
5. Remove redundant per-tile category label when family header is shown.  
6. Clarify Rain vs Hourly in picker copy.  
7. Diversify tile icons.

### Low
8. Consider future merge of Golden/Blue/Photo into one Light Windows tile.  
9. Long-term: optional “Briefing density” preference (Compact / Full).

---

## Small fixes applied in this review pass

| Fix | Why |
|-----|-----|
| Loading trust chip `Waiting` → `Settling` | Align with product language; avoid placeholder-era wording |
| Limited confidence score copy clarifies incomplete inputs | Reduce Excellent vs Limited contradiction |
| Interest actions `nowrap` + meta flex | Reduce Rivers & Water row height jump on phone |

No redesign. No new tiles. No merge. No deploy.

---

## Production readiness score

| Dimension | Score | Notes |
|-----------|------:|-------|
| Usefulness of tiles | 82 | Real catalog |
| First-run clarity | 70 | Brief too long |
| Mobile layout | 88 | Sprint 6 recovered |
| Trust | 74 | Confidence pairing |
| Beauty / polish | 86 | Premium feel |
| Customize UX | 68 | Interests-first |
| Vision fit | 76 | Discover strong; Observe buried |
| **Overall** | **78** | **B — minor polish before merge** |

---

## Ship recommendation

**B. Needs minor polish before merge.**

Approve Sprint 6 technical completion. Gate merge on a short hierarchy/Customize polish (High items above) — or accept known follow-ups if owner explicitly prefers merge-now with documented High follow-ups.

---

## Confirmation

- **Nothing merged to main.**  
- **Nothing deployed to production.**  
- Review is experience-first, not implementation-first.  
- Screenshots: `docs/rebuild-2026/dashboard-rc3-sprint7/`
