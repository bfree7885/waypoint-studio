# Dashboard Phase 1 Polish — Owner Review

**Status:** Awaiting owner visual/product review — **stop here; do not start Phase 2**  
**Date:** 2026-07-22  
**Authority:** `docs/rebuild-2026/` (esp. `03-dashboard-architecture.md`, `07-design-system.md`)  
**Git:** Nothing committed or pushed in this work block

---

## Verdict

Phase 1 shell presentation is polished from developer prototype toward a quiet premium flagship beginning. Architecture is unchanged: **Today Outside** + **Workspace** + placeholder widgets + Customize + Kiosk. No APIs, no live widgets, no Outdoor OS revival.

**Visual / Product Experience:** ready for owner approval.

---

## Before / After

Screenshots: [`phase1-polish/before/`](./phase1-polish/before/) · [`phase1-polish/after/`](./phase1-polish/after/)

| Viewport | Before | After |
|----------|--------|-------|
| Desktop workspace | [01-desktop-workspace.png](./phase1-polish/before/01-desktop-workspace.png) | [01-desktop-workspace.png](./phase1-polish/after/01-desktop-workspace.png) |
| Desktop customize | [02-desktop-customize.png](./phase1-polish/before/02-desktop-customize.png) | [02-desktop-customize.png](./phase1-polish/after/02-desktop-customize.png) |
| Laptop | [03-laptop-workspace.png](./phase1-polish/before/03-laptop-workspace.png) | [03-laptop-workspace.png](./phase1-polish/after/03-laptop-workspace.png) |
| Tablet | [04-tablet-workspace.png](./phase1-polish/before/04-tablet-workspace.png) | [04-tablet-workspace.png](./phase1-polish/after/04-tablet-workspace.png) |
| Phone | [05-phone-workspace.png](./phase1-polish/before/05-phone-workspace.png) | [05-phone-workspace.png](./phase1-polish/after/05-phone-workspace.png) |

Capture harness: `automation/capture-dashboard-phase1-polish.mjs`

### What changed in the frame

| Concern | Before | After |
|---------|--------|-------|
| Nav | App-shell tabs **and** in-shell text links | Single nav — app shell only |
| Footer chrome | “Dashboard rebuild · Phase 1 shell” | Removed |
| Widget empty copy | “Instrument not connected yet.” / Unavailable | “Waiting for weather data.” / Waiting |
| Today Outside | Flat heading + one engineering sentence | Compact premium panel + honest bullets |
| Widgets | Flat gray boxes, 3 defaults | Soft depth, category accents, 6 visible defaults + catalog families |
| Typography | Generic sans headings | Cormorant display titles + Inter body (WDS tokens) |

---

## Design decisions

1. **One navigation** — Removed the in-shell `Workspace · Customize · Kiosk` actions bar. App shell local nav remains the single source of truth (avoids duplicate tabs + text links).
2. **Today Outside orients; Workspace dominates** — Today is a compact information panel (not an editorial weather page). Workspace title is larger; widget grid carries visual weight.
3. **Honest product language** — Empty states describe what will appear (“Waiting for weather data.”) instead of engineering status (“Instrument not connected yet.”). Trust chips use **Waiting** for placeholder/pending — never invent numbers.
4. **Anticipate categories without implementing** — Placeholder catalog covers Conditions, Light, Air, Astronomy, Photography, Rivers, Wildlife, Alerts, Trail Conditions. Six on by default; Wildlife / Alerts / Trails off until chosen.
5. **Craftsmanship via WDS** — Dark navy field, morning-blue accent (aurora bridge), soft inset shadows, subtle hover lift, category top-edge cues. No purple-on-white, no cream+terracotta, no broadsheet denseness.
6. **Responsive by intent** — 12-column grid: 3-up desktop, 2-up tablet, 1-up phone; Today lines wrap horizontally on wide screens and stack on phone.

---

## Typography / spacing / nav / cards

| Layer | Treatment |
|-------|-----------|
| **Typography** | Display: `var(--wds-font-display)` (Cormorant). Body/UI: `var(--wds-font-body)` (Inter). Workspace title slightly larger than Today. |
| **Spacing** | Tighter Today padding; clearer section gap before Workspace; consistent card pad (~1rem) and grid gap (~0.85rem). |
| **Nav** | Shell features only; no duplicate in-content nav; phase footer removed. |
| **Cards** | Elevated surface, soft shadow, hover border/accent, category color hairline on top edge — tools you want to open, not wireframe boxes. |
| **Today Outside** | Panel with gradient wash + meta row (place · time · trust) + compact bullet placeholders. |

---

## Files touched (presentation)

| Path | Change |
|------|--------|
| `design-system/css/wds-dashboard-rebuild.css` | Full presentation polish + responsive |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` | Remove duplicate nav + phase footer |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js` | Compact panel + product bullets |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js` | Expanded placeholder families + product empty copy |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js` | Lede + empty-state copy |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js` | Catalog lede |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js` | Quieter kiosk chrome copy |
| `apps/dashboard/index.html` | Boot copy + cache-bust |
| `automation/test-dashboard-rebuild-phase1.mjs` | Assert new copy, nav, catalog |
| `automation/capture-dashboard-phase1-polish.mjs` | Before/after screenshot harness |

---

## Tests

```bash
node automation/test-dashboard-rebuild-phase1.mjs
# 74 passed, 0 failed
```

Coverage added/updated for: no duplicate actions nav, no Phase 1 footer, product empty copy, category anticipation, banned developer chrome strings.

---

## Remaining work before Phase 2

**Owner must approve visual/product experience first.**

Then Phase 2 may begin (not started):

1. Connect real providers per widget (independent hydrate; honest trust).
2. Today Outside observational summary from live/cached conditions (still compact).
3. Widget detail sheets / expand patterns.
4. Customize UX polish (drag reorder if desired; presets remain).
5. Kiosk density pass with real data and sunlight contrast.
6. Local-nav active-state for hash routes (`#/customize`, `#/kiosk`) if shell matching needs a follow-up.
7. Optional: retire unused Outdoor OS entry modules from default `wds.js` load once owner confirms rebuild is sole product path.

**Explicit non-goals until approved:** more widgets beyond placeholders, API wiring, Outdoor OS revival, commit/push/deploy.

---

## How to review locally

```bash
# From repo root with static server on :8765
# open http://127.0.0.1:8765/apps/dashboard/
node automation/test-dashboard-rebuild-phase1.mjs
node automation/capture-dashboard-phase1-polish.mjs after http://127.0.0.1:8765
```

---

## Stop

Await owner review of this polish. Do **not** begin Phase 2 widget implementation until Visual/Product Experience is approved.
