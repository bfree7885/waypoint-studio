# Dashboard Outdoor OS — Milestone 3 Owner Review

**Date:** 2026-07-22  
**Status:** STOP — **Milestone 3 complete; awaiting owner approval.**  
**Do not deploy. Do not merge. Do not begin another milestone.**  
**Authority:** Manifesto → Screen Specification → Architecture Reset  

---

## Verdict

Milestone 3 is a **craftsmanship-only** pass: typography micro-tuning, spacing/touch targets, detail-panel presentation, quiet motion, focus/keyboard behavior, loading polish, Day Arc / Sources / Look closer refinement, and perceived-performance cues. **No IA changes. No new intelligence. M2 PriorityRanker rules untouched.**

**Production Status (verified live): PRODUCTION BEHIND**

---

## 1. Before / after screenshots index

Folder: `docs/dashboard-os-m3-review/`  
Capture: `automation/capture-dashboard-os-m3-screenshots.mjs`  
Local server: `http://127.0.0.1:8799/apps/dashboard/` (Pike County seeded)

| # | Subject | Before | After |
|---|---------|--------|-------|
| 01 | Desktop first viewport | [`before/01-desktop-first-viewport.png`](./before/01-desktop-first-viewport.png) | [`after/01-desktop-first-viewport.png`](./after/01-desktop-first-viewport.png) |
| 02 | Desktop after scroll | [`before/02-desktop-after-scroll.png`](./before/02-desktop-after-scroll.png) | [`after/02-desktop-after-scroll.png`](./after/02-desktop-after-scroll.png) |
| 03 | Desktop Sources panel | [`before/03-desktop-sources-panel.png`](./before/03-desktop-sources-panel.png) | [`after/03-desktop-sources-panel.png`](./after/03-desktop-sources-panel.png) |
| 04 | Desktop Day Arc panel | [`before/04-desktop-day-arc-panel.png`](./before/04-desktop-day-arc-panel.png) | [`after/04-desktop-day-arc-panel.png`](./after/04-desktop-day-arc-panel.png) |
| 05 | Desktop Conditions panel | [`before/05-desktop-conditions-panel.png`](./before/05-desktop-conditions-panel.png) | [`after/05-desktop-conditions-panel.png`](./after/05-desktop-conditions-panel.png) |
| 06 | Mobile first viewport | [`before/06-mobile-first-viewport.png`](./before/06-mobile-first-viewport.png) | [`after/06-mobile-first-viewport.png`](./after/06-mobile-first-viewport.png) |
| 07 | Mobile after scroll | [`before/07-mobile-after-scroll.png`](./before/07-mobile-after-scroll.png) | [`after/07-mobile-after-scroll.png`](./after/07-mobile-after-scroll.png) |
| 08 | Mobile Sources sheet | [`before/08-mobile-sources-panel.png`](./before/08-mobile-sources-panel.png) | [`after/08-mobile-sources-panel.png`](./after/08-mobile-sources-panel.png) |
| 09 | Mobile Location panel | [`before/09-mobile-location-panel.png`](./before/09-mobile-location-panel.png) | [`after/09-mobile-location-panel.png`](./after/09-mobile-location-panel.png) |
| 10 | Desktop Do focus sample | [`before/10-desktop-do-focus.png`](./before/10-desktop-do-focus.png) | [`after/10-desktop-do-focus.png`](./after/10-desktop-do-focus.png) |

Night capture window: briefing correctly uses tonight/tomorrow posture (atmosphere `night`).

---

## 2. Performance improvements

| Change | Why |
|--------|-----|
| `contain: layout style` on reading sheet | Limits layout work to the briefing column |
| `content-visibility: auto` on after-scroll | Defers offscreen confirmation depth paint cost |
| Quiet sheet entrance (rAF `is-ready`) | Perceived performance — settles in without flashy loaders |
| Cache-bust `?v=os-m3-1` on OS CSS/JS boot assets | Avoids stale local CSS/JS during review |
| Skeleton shimmer only while loading | Honest progress without blocking hydrate |
| Atmosphere `will-change` gated; cleared under reduced-motion | Avoids unnecessary compositor pressure |

No engine/provider fan-out changes. No duplicate fetches introduced.

---

## 3. Accessibility improvements

| Change | Why |
|--------|-----|
| Shared `:focus-visible` ring (accent-tinted, 2px / 3px offset) | Keyboard path matches Spec §6.4 |
| Panel `aria-labelledby` + dialog title id | Named dialog for AT/screen readers |
| Focus trap (Tab / Shift+Tab) inside open panel | Spec: Esc closes; focus stays in sheet |
| Restore focus to opener on close | Returns to Place / Matters / Sources cue |
| Sheet `inert` + `aria-hidden` while panel open | Background not in tab order |
| Backdrop control with accessible close label | Click-away dismiss without orphaned focus |
| Larger close control (min 44×44) | Touch + motor accessibility |
| Prefs / location inputs get focus-visible | Forms match Outside focus language |
| `prefers-reduced-motion` disables transitions, skel shimmer, best-window whisper | Spec §7.6 |

**Note:** Headless CDP `.focus()` often does **not** trigger `:focus-visible`, so shot `10` may under-show the ring vs real keyboard Tab. Ring is present in CSS for genuine keyboard focus.

---

## 4. Interaction improvements

| Change | Why |
|--------|-----|
| Hover color/border refinements on gateways, Sources, Matters, Place | Pointer affordance without chrome noise |
| Backdrop dismiss + Esc close with animated exit | Expected sheet behavior (Apple Weather / Linear) |
| Panel open stores opener; close restores it | Keyboard continuity |
| Touch-friendly padding on quiet chrome / cues | Thumb reach Spec §6.1 |
| `-webkit-tap-highlight-color: transparent` | Removes harsh mobile flash |
| Active press on primary buttons | Quiet tactile feedback |

IA, open targets, and panel inventory unchanged.

---

## 5. Motion improvements

| Motion | Behavior | Reduced-motion |
|--------|----------|----------------|
| Sheet entrance | Short opacity + 0.35rem rise on `is-ready` | Instant / visible |
| Panel open/close | Backdrop fade + sheet slide/scale (~220–280ms) | Instant show/hide |
| Loading skeletons | Soft shimmer | Static blocks |
| Best-window beat | Very slow opacity whisper (Spec ≤2–3 motions) | Off |

No perpetual CTA bounce. No particle atmosphere.

---

## 6. Mobile improvements

- Bottom sheet handle + safe-area padding on panel host / sheet foot  
- Sources rows stack name → status on narrow widths  
- Touch min-heights on chrome and cues  
- Sheet bottom padding accounts for home indicator  
- Mobile Sources / Location shots captured in after set  

---

## 7. Desktop improvements

- Centered panel with quieter scale-in (not a card wall)  
- Sticky panel header while scrolling long Sources / Day Arc lists  
- Sources as two-column name/meta rows (live tone quiet green; unavailable recedes)  
- Day Arc panel as timed timeline rows (time · label · detail) instead of dense bullets  
- Look closer gateway spacing slightly more editorial  

---

## 8. Remaining known issues

1. **Production is not Outdoor OS** — live site still serves Recovery/V2/V3 “Today’s brief” chrome at build `63fc457` (see Production Status).  
2. **Local `main` diverged from `origin/main`** — local HEAD `6062b41` (M2) is **not** an ancestor of origin; origin is **32 commits ahead** (RC3 path) and local is **1 commit ahead** (M2 only). Integrating Outdoor OS requires an explicit owner merge/rebase strategy — not a fast-forward push.  
3. **Programmatic focus screenshots** understate `:focus-visible` rings.  
4. **Night capture only** for this polish pack — daytime atmosphere not re-shot in M3.  
5. Some providers (NWS / USGS / Overpass / Nominatim) may show unavailable in Sources depending on live fetch — honest; not a polish defect.  
6. Studio global nav / footer density remains outside Outside composition (deferred).  

---

## 9. Polish intentionally deferred

- Hero photography / real sky imagery  
- Panel split-companion on tablet (Spec optional)  
- Swipe-down-to-dismiss gesture physics  
- Boot-graph reduction / Architecture Phase 5  
- Icon system beyond text hierarchy  
- Daytime owner visual pack  
- Any M2 ranking / copy / intelligence revisits  
- Deploy / merge / production cutover  

---

## Production Status

**Final status: PRODUCTION BEHIND**

Verified live against deployment metadata — **not** inferred from local git alone.

| # | Check | Result |
|---|--------|--------|
| 1 | Current local branch + HEAD SHA | `main` @ **`6062b41b14a87da71d32ab4cbf44a3c5929b555b`** (`Complete Dashboard Milestone 2 — Waypoint Intelligence`). M3 polish is **uncommitted** working tree on top of this SHA. |
| 2 | Approved Dashboard commits pushed to `origin/main`? | **No.** `6062b41` is **not** contained in `origin/main` (`git merge-base --is-ancestor 6062b41 origin/main` → false). Local: **ahead 1, behind 32**. |
| 3 | Current `origin/main` SHA | **`63fc45748ef9e283e413025c24f73cf476415b39`** — *Merge branch 'recovery/rc3-consolidation' — RC3 production release* |
| 4 | Production provider + workflow | **GitHub Pages** via `.github/workflows/pages.yml` (`Deploy GitHub Pages`), Actions `deploy-pages@v4`. DNS/CDN: **Fastly** in front of GitHub (`x-served-by`, `x-fastly-request-id`). Site: **waypointstudio.org**. |
| 5 | Latest successful production deployment SHA | **`63fc457`** — workflow run [29873643657](https://github.com/bfree7885/waypoint-studio/actions/runs/29873643657) (2026-07-21T22:24Z). Confirmed by live `meta[name="waypoint-build"]=63fc457` and `https://waypointstudio.org/data/build-info.json`. |
| 6 | Production includes `6062b41`? | **No.** |
| 7 | Production includes final Milestone 3 commit? | **N/A / No** — M3 not committed; not pushed; not deployed. |
| 8 | Exact live Dashboard URL tested | **https://waypointstudio.org/apps/dashboard/** |
| 9 | Live vs local screenshots | See below |
| 10 | Caching that could show older UI | HTML `Cache-Control: max-age=600` + Fastly (`age`, `x-cache: HIT`). Meta tags request no-cache but CDN still caches ~10 minutes. No Dashboard service worker found in `apps/dashboard`. Asset URLs without content hashes can lag after deploy until TTL. |
| 11 | Failed / skipped / queued / cancelled deploy jobs | Recent Pages runs: **success** on `63fc457`; historical among last 20: **6 failures**, **2 cancelled** (e.g. failed `3e918b0` [29768569918](https://github.com/bfree7885/waypoint-studio/actions/runs/29768569918); cancelled `b4d423b`, `20b022e`). **CI failed** on latest `63fc457` push while Pages **succeeded** (Pages is intentionally independent of CI). No queued/in-progress Pages run observed at check time. |
| 12 | Corrective steps if production is behind | See corrective plan below. **Do not auto-deploy** (owner has not instructed). |

### Live vs local comparison

Capture: `automation/capture-dashboard-os-m3-production-compare.mjs`  
Meta: [`production-compare.json`](./production-compare.json)

| Surface | Local (Outdoor OS @ M3 polish) | Production (`63fc457`) |
|---------|--------------------------------|-------------------------|
| Desktop | [`local/01-desktop-first-viewport.png`](./local/01-desktop-first-viewport.png) | [`production/01-desktop-first-viewport.png`](./production/01-desktop-first-viewport.png) |
| Mobile | [`local/02-mobile-first-viewport.png`](./local/02-mobile-first-viewport.png) | [`production/02-mobile-first-viewport.png`](./production/02-mobile-first-viewport.png) |

**Observed difference:** Production still presents the **legacy Recovery / V2 / V3** Dashboard (tab strip “Today’s brief / What matters / Light…”, customize chrome, regional overview card). Local presents **Outdoor OS Outside** (Happening → Matters → Do; no peer domain tabs). Build marker production=`63fc457`, local=`local`.

### Corrective plan (owner-gated — not executed)

1. **Reconcile histories:** Local Outdoor OS/`6062b41` diverged from RC3 `origin/main`. Owner chooses rebase-onto-`63fc457` vs merge strategy so M1–M3 OS work lands without losing RC3 releases.  
2. **Commit M3 polish** when approved (this review).  
3. **Push** reconciled `main` to `origin` (`git push` — not force unless owner explicitly directs).  
4. Confirm **Deploy GitHub Pages** run succeeds for the new SHA; verify `data/build-info.json` + `meta[name=waypoint-build]` match.  
5. Hard-refresh / wait Fastly TTL (~600s) and re-screenshot `https://waypointstudio.org/apps/dashboard/` until Outdoor OS is visible.  
6. Re-run Production Status checklist → target **LIVE AND VERIFIED**.

---

## Tests

| Suite | Result |
|-------|--------|
| `automation/test-dashboard-os-interpret.mjs` | **79 passed**, 0 failed |
| `automation/test-dashboard-v2.mjs` | **21 passed**, 0 failed |
| `automation/test-dashboard-today-outside.mjs` | **All passed** |
| `automation/test-dashboard-reliability.mjs` | **41 passed** |

---

## Files touched (M3 polish — uncommitted)

- `design-system/css/wds-dashboard-os.css`  
- `design-system/js/dashboard/os/wds-dashboard-os.js`  
- `design-system/js/dashboard/os/wds-dashboard-os-render.js`  
- `design-system/js/dashboard/os/wds-dashboard-os-compose.js` (Day Arc clock-label guard only — presentation)  
- `apps/dashboard/index.html` (cache-bust)  
- `automation/capture-dashboard-os-m3-screenshots.mjs`  
- `automation/capture-dashboard-os-m3-production-compare.mjs`  
- `docs/dashboard-os-m3-review/**`  

---

## STOP

Awaiting owner approval.  
**Do not commit** unless asked.  
**Do not deploy.**  
**Do not start another milestone.**
