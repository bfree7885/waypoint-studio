# Product Recovery Phase 1 — Changelog

**Scope:** Dashboard performance & UX  
**Commit policy:** Not committed / not pushed (owner review)  
**Date:** 2026-07-18

---

## Intent

Stop feature expansion. Make Dashboard feel instant, calm, and commercial — shell first, interpretation first, tabs for detail.

---

## Layout & UX

### Added
- **Today's Summary** strip (verdict headline + lede) always above tabs — `wds-dashboard-today-summary.js`
- **Instant tabs:** Today · Weather · Photography · Rivers · Air · Sun & Moon · Alerts — `wds-dashboard-recovery.js`
- **Today tab** interpretive bullets (hiking, golden hour, UV, AQI, rivers, alerts, sunrise wildlife, photography, precip, seasonal watch)
- Sticky tab bar with horizontal scroll on mobile; keyboard arrows / Home / End
- Last-selected tab persisted in `localStorage`
- Alerts panel from live NWS package (clear empty state when none)
- Recovery CSS: `design-system/css/wds-dashboard-recovery.css`
- Critical skeleton CSS inlined in `apps/dashboard/index.html` shaped like summary + tabs

### Removed from default Dashboard view
- Stacked outdoor-weather **anchor** on first paint
- Glance vitals row
- Morning **briefing package** card stack
- Category section accordion grid
- Experiences section below dashboard
- Field tools link row under dashboard
- Methodology block on dashboard boot
- Opacity fade-in on `#wds-content-engine.wdb-content-ready` (flash / jump)

### Preserved
- Customize dashboard (settings button)
- Legacy layout via `localStorage waypoint-dashboard-recovery-v1 = 0`
- OIP providers, trust tags, location briefing header
- Originals of widget mount implementations (lazy-invoked)

---

## Performance

| Change | Effect |
|--------|--------|
| Lazy specialty mounts per tab | Boot no longer mounts Weather/Photo/Water/Sky/etc. until opened |
| Skip `briefingPackage.refresh` in recovery | Less main-thread work after hydrate |
| `settleStaleMounts` ignores `data-wdb-mounted="0"` panels | Unvisited tabs stay honest Loading until opened |
| Non-blocking font stylesheet + dropped Inter 300 | Faster text paint with fallbacks |
| Slimmer boot `sections: ['outdoor-dashboard']` | Less HTML / less layout |
| Perf marks (`wdb-*`) | Measurable shell / hydrate / tab mount |
| `min-height` on summary + panels | Fewer layout jumps |

See `docs/DASHBOARD-SPEED-AUDIT-2026-07.md` for the full audit.

---

## Code quality

| File | Change |
|------|--------|
| `wds-dashboard-engine.js` | Delegates render/mount to recovery; safer settle |
| `wds.js` | Registers today-summary + recovery modules |
| `wds-content-engine.js` | Shell paint marks; quieter outdoor dashboard chrome |
| `home-boot.js` | Recovery sections; hydrate timing marks |
| `wds-dashboard-home.css` | Imports recovery CSS |
| `home-dashboard.css` | Removes content fade animation |

**Not deleted (still used by Customize / escape hatch):** catalog widgets, briefing package module, glance defs.

---

## Mobile

- Tab strip scrolls horizontally without wrapping jump
- Summary/tabs padding tightened under 640px
- Sticky tabs for one-thumb switching
- Reserved heights to limit CLS when hydrating
- `prefers-reduced-motion` respected for tab hover / skeleton shimmer

---

## Visual polish

- Summary uses calm green accent (caution/wait variants)
- Serif display for summary title; quieter meta cue under lede
- Empty / loading / clear-alert copy rewritten to be intentional
- Customize tucked under a light divider — not competing with summary

---

## Files touched

```
apps/dashboard/index.html
apps/dashboard/js/home-boot.js
css/home-dashboard.css
design-system/css/wds-dashboard-home.css
design-system/css/wds-dashboard-recovery.css          (new)
design-system/js/wds.js
design-system/js/wds-content-engine.js
design-system/js/dashboard/wds-dashboard-engine.js
design-system/js/dashboard/wds-dashboard-today-summary.js  (new)
design-system/js/dashboard/wds-dashboard-recovery.js       (new)
docs/DASHBOARD-SPEED-AUDIT-2026-07.md                 (new)
docs/PRODUCT-RECOVERY-PHASE1-CHANGELOG.md             (this file)
```

---

## Verification checklist (owner)

1. Open `/apps/dashboard/` on broadband — summary + tabs appear without stacking every widget.
2. Confirm Today bullets interpret (not raw gauges).
3. Switch Weather → back to Today — instant; Weather mounts once.
4. Narrow viewport — no tab wrap explosion; little vertical jump on hydrate.
5. DevTools → `performance.getEntriesByType('measure')` filtered to `wdb-`.
6. Optional: `localStorage.setItem('waypoint-dashboard-recovery-v1','0')` to compare legacy.

---

## Remaining future work

- Dashboard-only JS bundle (cut ~108-file chain)
- Self-hosted font subset
- CSS concatenate (kill `@import` waterfall)
- Silent OIP refresh without tab DOM rewrite
- CDP budget gates in CI

---

**Not committed. Not pushed. Owner review required.**
