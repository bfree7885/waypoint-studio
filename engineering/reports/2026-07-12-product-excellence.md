# Product Excellence Sprint Report — 2026-07-12

## Executive Summary

Polished the current multi-app Studio shell for launch honesty and reliability: fixed broken Dashboard cross-app links, labeled foundation apps accurately, hardened boot/error paths, and improved dialog keyboard accessibility. No product redesign. Automated smoke, mobile layout, and platform suites pass.

## Issues discovered (prioritized)

### P0
1. Dashboard Field tools links resolved under `/apps/dashboard/apps/…` (404)
2. Foraging widget “Open ForageCast” same broken path
3. Foundation apps marketed as `live` in Studio nav

### P1
4. Apps launcher dialog lacked focus trap
5. Location prompt claimed `aria-modal` without document-level trap
6. Studio home / Dashboard could spin forever on failed module load
7. Dashboard section hash ignored after async paint
8. Foundation “Open now” items were non-links; status copy overclaimed
9. SignalTerrain / Steepleaf / Savant nav & preview copy contradicted products
10. Dashboard local nav “River” vs section “Water”
11. Customize toggles used generic “Show widget” labels

## Issues fixed

| Fix | Why it improves the product |
|-----|-----------------------------|
| Depth-aware Field tools + ForageCast hrefs | Paying customers can leave Dashboard into sibling apps |
| `foundation` status + chips on home/launcher | Honest catalog; no bait-and-switch |
| Aligned descriptions + preview.json | Catalog matches real products |
| Launcher + location focus traps | Keyboard users stay in dialogs |
| Boot timeouts + Retry | Failed loads become recoverable |
| Post-init hash scroll + taller scroll-margin | Section deep links land under chrome |
| Foundation Open-now links + Retry | Actionable foundation landings |
| Widget `Show {title}` labels | Clearer screen-reader customize UI |
| River → Water | Consistent terminology |

## Remaining recommendations (meaningful only)

- Photo Coach smoke still reports missing App Shell markers intermittently (page has shell markup; readiness check may race) — investigate separately
- Add axe/Lighthouse CI samples (manual gates today)
- Optional: sync `nav-registry.json` → `wds-app-nav-config.js` via a checked-in generator script in CI

## Test results

- `automation/test-platform-foundation.mjs` — PASS
- `automation/test-platform-hardening.mjs` — PASS
- `automation/test-fieldry-mvp.mjs` — PASS
- `automation/test-knowledge-platform.mjs` — PASS
- `automation/test-photographer-profile.mjs` — PASS
- `automation/test-personalized-coaching.mjs` — PASS
- `scripts/validate-*.mjs` (location, dashboard-data, surface, location-sensitive) — PASS
- `automation/smoke-browser.mjs` — PASS (18 routes, no console errors)
- `automation/mobile-layout.mjs` — PASS (3 viewports × 6 pages)

## Accessibility report

- Skip links unchanged and present on primary surfaces
- Apps launcher: Tab cycle trap + Escape + restored focus
- Location prompt: document-capture Tab trap; release on complete
- Customize switches: named aria-labels
- Manual checklist (`engineering/playbooks/accessibility-gate.md`) still required for full WCAG sign-off (no axe CI yet)

## Lighthouse results

Not automated in this sprint. Manual gate: `engineering/playbooks/performance-gate.md`. No large new assets added; changes are JS/CSS/copy only.

## Performance summary

- No new network dependencies
- Boot paths now fail closed with timeouts instead of infinite rAF loops
- Scroll-margin CSS only; negligible paint cost

## Security observations

- Foundation/error UIs no longer leak raw `Error.message`
- Dynamic strings continue to use `esc` / `escapeHtml`
- No secrets or third-party script additions

## Technical debt removed

- Dual dishonest status (`live` vs catalog `foundation`)
- Broken relative routing debt from App Shell migration
- Preview.json drift for foundation apps
- Infinite boot wait anti-pattern on Studio home + Dashboard

## Architecture improvements

- Field tools hrefs use `WDS.appNav.resolveRoute` (same depth model as shell)
- Foundation boot mounts via `appShell.mount({ appId })` (correct API)

## Production readiness assessment

**Conditionally ready for production deploy of these polish fixes.** Highest-value trust bugs (404 links + live labeling) are fixed and regression-tested. Remaining gaps (automated a11y/Lighthouse) are process tooling, not customer-blocking regressions introduced here.

Would release these changes to paying customers: **Yes**, with the understanding that foundation apps remain foundation landings (now honestly labeled).
