# RC2.5 Sprint 5 — Outdoor Intelligence Experience Polish

**Date:** 2026-07-20  
**Repo:** `bfree7885/waypoint-studio` (`main`)  
**Mission:** Release-candidate polish for the Outdoor Intelligence Dashboard (kiosk, mobile, a11y, performance, reliability, docs).

## What landed

| Area | Change |
|------|--------|
| Kiosk (Dashboard) | `dashboardV3Kiosk` — auto-refresh, live clock, sticky Brief, minimal chrome, Esc exit, connectivity banner, layout preset architecture |
| Kiosk (standalone) | Outdoor Brief strip + larger type; same OIP-derived cues |
| Visual / mobile | Expanded `wds-dashboard-v3.css` — Brief hero, layout grid, 320–1440 breakpoints, touch targets |
| A11y | Focus rings, skip link, `aria-pressed` kiosk control, reduced-motion, status live regions |
| Performance | Refresh fingerprint skip; clock via textContent only |
| Reliability | Offline/cached banners; reconnect refresh in kiosk |
| Docs | `docs/OUTDOOR-INTELLIGENCE-DASHBOARD.md` rewritten as overview |

## Parallel-work note

Did not redesign product IA or wipe V2/V3 engines from Sprints 1–4. Polish layers on the existing dashboard stack.

## Validation

```bash
node automation/test-dashboard-v3.mjs
node automation/test-dashboard-v2.mjs
node automation/test-dashboard-reliability.mjs
node automation/test-kiosk-modules.mjs
# optional with server:
node automation/mobile-layout.mjs http://127.0.0.1:8080
node automation/a11y-smoke.mjs http://127.0.0.1:8080
node automation/validate-production-links.mjs
```

## Out of scope / RC3

- Default-on layout rotation on dedicated displays  
- Full DnD reorder UI  
- Mounting full V3 board inside standalone `kiosk.html`  
- Deep VoiceOver/NVDA pass on customize dialog  
