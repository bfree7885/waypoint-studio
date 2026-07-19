# Steepleaf — Product Recovery Phase 1

**Date:** 2026-07-18 / 2026-07-19  
**Status:** Uncommitted — owner review  
**Commit policy:** Do not commit / do not push until requested

---

## Mission check

| Question | After Phase 1 |
|----------|----------------|
| What should I brew today? | **Today's Tea** briefing on Home (`#home`) |
| How do I brew it well? | **Today's Brew** with explainable temperature/time/leaf guidance + timer |
| How do sessions compare? | Session detail compares parameters/rating/notes to the prior brew of the same tea |
| Fabricated journals? | **No** — empty states stay empty; recommendations only use the user’s private shelf |
| Identity | Affirmed as **tea companion** (not herbarium/botany track) |

---

## Architecture improvements

1. **SPA companion shell** on `apps/steepleaf/index.html`  
   - Hash nav: Home · Today's Brew · My Collection · Brewing Sessions · Tea Journal · Discover · Learning · Search · Settings  
   - Replaces brochure-only foundation mount as the primary experience  

2. **Data layer 1.1** (`steepleaf-models.js`)  
   - Collection fields: type, origin, region, harvest year, vendor, storage, quantity, favorite, purchase info  
   - Session fields: temp, leaf, water, steep, infusions, vessel, flavors, mood, rating, notes  
   - Search, export/import, preferences, delete  

3. **Briefing engine** (`steepleaf-briefing.js`)  
   - Interprets collection + sessions + seasonal calendar cues  
   - Every recommendation includes **why**  
   - Never invents teas or tasting notes  

4. **Guides & learning** (`steepleaf-guides.js`)  
   - Style brewing defaults with uncertainty  
   - Practical literacy topics (categories, oxidation, water, storage, terms)  

5. **Identity reconciliation**  
   - `product-registry.json` updated from herbarium/ForageCast-merge framing to tea companion  
   - Nav + catalog status → active product workflows  

6. **Removed**  
   - Unused `preview.json`  
   - Foundation-boot / platform-foundation as primary UI path  
   - Placeholder “ready: false” catalog/journal routes as the product surface  

---

## Performance

| Change | Effect |
|--------|--------|
| Dropped foundation JSON fetch on critical path | Faster first paint |
| Local-only data (no network for core loop) | Instant navigation between panels |
| Hash SPA | No full reloads between workflows |
| Non-blocking font load | Text paints sooner |
| Perf marks `sl-html`, `sl-mount`, `sl-paint` | Measurable paint |

**Remaining:** Very large collections (hundreds) still render full lists — add virtualization before 1.0 if users exceed ~200 teas.

---

## Reliability & empty states

| State | Behavior |
|-------|----------|
| Empty collection | Honest briefing; CTA to add a tea |
| Empty sessions | Clear invite to start Today's Brew |
| Missing tea/session id | Alert + back link — no infinite spinner |
| Import failure | Status message; no silent corruption |
| Offline | Full core loop works (localStorage) |

---

## UX improvements

- Calm leaf-green visual language (softened neon token)  
- Kitchen-friendly timer display  
- Collection filters/sort without page sprawl  
- Discover maps styles vs **your** shelf gaps — not a marketplace  
- Journal shows only sessions with notes/mood/flavors/ratings  

---

## Remaining technical debt

| Item | Notes |
|------|-------|
| No multi-device sync | Intentional privacy default |
| Timer accuracy vs background tabs | Acceptable for Phase 1; Wake Lock / Worker later |
| Knowledge platform cross-links | Samples exist; not yet in Discover UI |
| Photo of tea / packaging | Not in scope |
| Quantity decrement on brew | Manual remaining field only |
| Strategic docs still mention botany merge | `STRATEGIC-DIRECTION.md` / portfolio audit need follow-up edits |
| Automated UI tests for brew loop | Foundation store test only |

---

## Recommendations before Version 1.0

1. Virtualize or paginate collection/session lists  
2. Wire labeled Knowledge tea samples into Discover (explicitly sample)  
3. Optional quantity auto-decrement + low-stock briefing bullet  
4. Background-safe timer + audible completion option  
5. Align remaining strategy docs with tea-companion identity  
6. Accessibility pass on timer controls (screen reader announcements)  
7. Light onboarding: “Add three teas you own” — still no fake journal  

---

## Honest assessment

Steepleaf is no longer a foundation brochure. It is a **usable private tea companion** for daily brew decisions and journaling.

It is **not** yet Version 1.0: sync, richer sensory tools, Knowledge integration, and strategy-doc cleanup remain. But a new user can already understand what to brew, how to steep it, and how cups change over time — without fabricated content.
