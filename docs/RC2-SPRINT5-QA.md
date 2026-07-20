# RC2 Sprint 5 — QA Report

**Date:** 2026-07-20  
**Repo:** `bfree7885/waypoint-studio` (`main`)  
**Mission:** Mobile, accessibility, and professional polish — quality only; no product redesign.

## Scope

Polished shared platform surfaces without rewriting Dashboard V2 widget IA (Sprint 3) or wiping homepage/nav/articles discoverability (Sprint 4). Changes land primarily in:

| Area | Assets |
|------|--------|
| Contrast / tokens | `design-system/css/wds-tokens.css` |
| Focus / overflow / forms / safe-area | `design-system/css/wds-experience-v2.css` |
| App shell + home cards | `design-system/css/wds-app-shell.css`, `wds-platform-integration.css` |
| Contact / Knowledge touch | `wds-contact.css`, `wds-knowledge.css` |
| Error recovery | `design-system/js/platform/wds-platform-ui.js` (v2.1.0) |
| Automation | `automation/mobile-layout.mjs`, `automation/a11y-smoke.mjs`, `test-experience-system-v2.mjs` |

## What was polished

1. **Contrast** — Raised muted/secondary parchment opacities so meta labels approach WCAG AA on navy surfaces.
2. **Mobile** — Document overflow clip; safe-area insets on sticky chrome; 16px form fonts (no iOS zoom); full-width contact actions under 480px; home search + directory card action targets.
3. **Accessibility** — Broader `:focus-visible` rings; provider status + Support/Contact recovery links in shared `errorHtml`; Knowledge filter/toggle 44px targets.
4. **Performance (safe)** — Reserved min-height on busy home directory mount to reduce layout shift; no feature rewrites or provider changes.
5. **Visual consistency** — Directory cards (article + Launch/Overview) styled to match shell tokens; shared button/touch language reinforced.

## Browser / viewport QA

| Surface | Chromium | Firefox | Notes |
|---------|----------|---------|-------|
| Home `/` | Exercised via CDP automation | Manual spot-check if available | Search + Apps launcher |
| Contact / Support / Knowledge | CDP mobile matrix | Spot-check | Forms + filters |
| Dashboard | CDP (12s wait) | Spot-check | Chrome only in automation; do not change widget IA |
| Scenes / Fieldry / ForageCast | CDP subset | — | Horizontal scroll gate |

Viewports automated: **320, 375, 390, 430, 768, 1024, 1440** (+ iPhone landscape).

## Test commands

```bash
# Static cohesion
node automation/test-experience-system-v2.mjs

# Serve locally, then:
python3 -m http.server 8080
node automation/mobile-layout.mjs http://127.0.0.1:8080
node automation/a11y-smoke.mjs http://127.0.0.1:8080
```

Axe source: `audits/live-site-qa/node_modules/axe-core` (install there if missing).

## Results (this sprint)

| Gate | Result |
|------|--------|
| `node automation/test-experience-system-v2.mjs` | **32 passed** |
| `node automation/mobile-layout.mjs` (fast matrix: 320/390/768/1440 × critical routes) | **PASS** |
| `MOBILE_LAYOUT_FULL=1` | Available for extended matrix; not required for merge |
| `node automation/a11y-smoke.mjs` | **PASS** (home, about, contact, support, knowledge, settings, dashboard, scenes, fieldry, foragecast) |
| Firefox 152 | System browser present; Playwright Firefox binary not installed in this environment — Chromium automation is the gate. Manual Firefox spot-check recommended before public RC. |
| Chromium (Playwright + system `/usr/bin/chromium-browser`) | Primary automation browser |

Contrast remediation during this sprint reduced Knowledge axe serious nodes from ~48 → 0 and Dashboard from ~38 → 0 on the smoke set (after token alias + Knowledge dark surfaces + recovery-tab colors).

## Remaining defects (later sprints)

1. Leaflet / Sheds map keyboard path and control labeling.
2. Nested interactive patterns in Photo Coach / Hidden Landscapes.
3. Full Steepleaf light + SignalTerrain cyber contrast pass.
4. Shared modal focus-trap primitive.
5. Screen-reader (VoiceOver / NVDA) pass on Dashboard Today Outside + Volunteer Discover.
6. Dense cyber tables still rely on local overflow; thumb-reach HUD audit for Sheds.

## Parallel-work notes

- Did **not** redesign Dashboard V2 widgets / Waypoint’s Take.
- Homepage journey cards / nav registry edits from Sprint 4 left intact; shell CSS polishes their markup.
- Did **not** commit `waypoint-audit.zip`.
- Link validator / Pages deploy paths unchanged.

## Related docs

- `docs/ACCESSIBILITY-IMPROVEMENTS.md`
- `docs/MOBILE-REVIEW.md`
- `docs/Accessibility-Review.md` (Experience System V2 baseline)
- `docs/RC1-ACCESSIBILITY-SUMMARY.md` (production axe baseline)
