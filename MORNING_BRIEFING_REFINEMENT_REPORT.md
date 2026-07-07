# Morning Briefing Refinement Report

**Project:** Make Waypoint Feel Alive  
**Date:** July 7, 2026  
**Branch:** `main`

## Summary

Refined the homepage morning outdoor briefing so the opening screen answers seven human questions in order, synthesizes conditions instead of listing raw weather, and adds rich **Today in Nature**, **Outdoor Missions**, and **Photography field guidance** sections — all with honest Live / Estimated / Educational / Editorial labels.

---

## Everything Improved

### Morning hero (7 questions)
1. **Where am I?** — City, county, state, elevation  
2. **What is happening outside right now?** — Human synthesis (humidity, wind, clouds, comfort)  
3. **What changed since yesterday?** — `localStorage` snapshot comparison  
4. **What should I notice today?** — Species, ecology, or field cues  
5. **What should I photograph?** — Light and subject guidance  
6. **Should I go outside?** — Verdict with reasoning  
7. **What should I learn today?** — Daily lesson integration  

### Today / Now / Next pulse
Mobile-first strip at the top of the briefing: verdict, current conditions, and next window (golden hour / sunrise).

### Today in Nature
Rich daily cards covering bird activity, wildlife movement, flowering, tree phenology, insects, migration, fungi, river conditions, night sky, astronomy, ecology, photography, and seasonal change — each with **Why this matters** and trust labels.

### Today's Outdoor Missions
3–5 rotating small activities (walk, photograph reflections, listen for frogs, cloud study, tracks, sunset, etc.) with condition-aware selection.

### Photography field guidance
Expanded panel: light quality, best shooting window, fog probability, cloud interest, landscape/sunrise-sunset, astro outlook, macro, bird photography, water reflections, UV impact — each explaining **why**.

### Why This Matters
Every major observation includes explanatory copy (UV → contrast and heat stress, stream flow → crossings, etc.).

### Empty states
When live data is unavailable, widgets teach instead of going blank — educational missions, nature cards, and photo tips.

### Reduced clutter
- Brief strip slimmed to verdict + stats + look-for (outdoor score grid moved into briefing sections)  
- Domain notices collapsed into **Full domain briefing** `<details>` to avoid repeating the hero narrative  

### Typography & hierarchy
New CSS for morning pulse, answer cards, nature grid, missions, photo field guide, and learn-today — improved spacing and readability within the existing visual identity.

---

## Files Changed

| File | Change |
|------|--------|
| `design-system/js/dashboard/wds-morning-briefing.js` | **New** — synthesis, snapshots, Today in Nature, photo field guide, render helpers |
| `design-system/js/dashboard/wds-dashboard-briefing-package.js` | Integrated morning hero, missions, collapsed notices, educational empty states |
| `design-system/js/dashboard/wds-dashboard-challenge.js` | Added `generateMissions()` with 12 rotating outdoor missions |
| `design-system/js/dashboard/wds-dashboard-brief.js` | Slimmed strip; UV why-it-matters in verdict |
| `design-system/js/wds.js` | Register `wds-morning-briefing.js` in load order |
| `design-system/css/wds-dashboard-widgets.css` | Styles for morning, nature, missions, photo field, learn sections |
| `automation/smoke-browser.mjs` | Morning hero assertions (7 answers, pulse) |
| `automation/check-morning-briefing.mjs` | **New** — manual verification helper |

---

## Tests Run

```bash
node --check design-system/js/dashboard/wds-morning-briefing.js
node --check design-system/js/dashboard/wds-dashboard-briefing-package.js
node --check design-system/js/dashboard/wds-dashboard-challenge.js
node --check design-system/js/dashboard/wds-dashboard-brief.js
node automation/smoke-browser.mjs http://127.0.0.1:8080
```

**Result:** `SMOKE: PASS` — zero console errors on homepage and waypoint-scenes.

**Homepage checks (automated):**
- `hasMorning: true`
- `hasPulse: true`
- `morningAnswers: 7`
- `hasBriefingDoc: true`
- `natureCards` / `missionCards` / `photoCards` present (educational mode when live weather pending in headless)

---

## Screens Affected

- **Homepage outdoor dashboard** (`/` — `#outdoor-dashboard`)
  - Briefing header (location / date — unchanged)
  - Morning brief strip (slimmed)
  - Unified briefing document (`wdb-doc`) — new layout
- **Dashboard widgets** — story/highlights still sourced from briefing package (unchanged API)

---

## Manual Review Checklist

- [ ] Open homepage on mobile — **Today / Now / Next** visible without scrolling
- [ ] Set Pike County location — live weather, nature cards, missions populate
- [ ] Set out-of-bundle coordinates — U.S. educational mode labels appear
- [ ] Verify trust badges: Live, Estimated, Educational, Editorial on cards
- [ ] Expand **Full domain briefing** — domain notices still present
- [ ] Return next day — **What changed since yesterday** shows delta
- [ ] Confirm no duplicate outdoor score grid in brief strip
- [ ] Check photography field guidance for golden hour and UV copy
- [ ] Waypoint Scenes app — no regressions

---

## Quality Check

| Question | Answer |
|----------|--------|
| Would someone check this every morning? | Yes — pulse + 7 answers give immediate orientation |
| Does it create curiosity? | Yes — missions and nature cards invite observation |
| Does it make someone want to go outside? | Yes — verdict + missions are actionable |
| Better observer? | Yes — why-it-matters on every card |
| Appreciation of nature? | Yes — seasonal and ecological context at latitude |

---

## Commit

```
Refine Waypoint morning outdoor briefing experience
```
