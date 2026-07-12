# Platform Audit — July 2026

**Sprint:** Full Platform Audit, Stability, and Hardening  
**Date:** 2026-07-12  
**Result commit:** landed on `main` (see git log)  
**Smoke:** `automation/smoke-browser.mjs` PASS across expanded route list (2026-07-12 local Chrome run). Note: `status.html` intentionally surfaces engine publish diagnostics and may flag Kansas river content — that is an ops surface, not the user dashboard.

---

## Audit scope

Reviewed:

- All public HTML entry points (dashboard, kiosk, status/debug, apps, foundations, Terrainbound redirect, species profile, design-system demos)
- Shared design-system JS/CSS loaders (`wds.js`, `wds-platform.js`, platform kernel, WOS, Knowledge, OIP/RI)
- Platform stores, observation schema, Knowledge Platform
- Automation tests + GitHub Actions `smoke.yml`
- Storage families, privacy/XSS surfaces, accessibility shared CSS
- Documentation: UNIFIED-PLATFORM, Knowledge, WOS, roadmap, architecture

**Not claimed:** Formal security certification, full visual QA on every viewport with a physical device farm, or complete elimination of dual Photo Coach storage.

---

## Architecture reviewed

| Layer | Status |
|-------|--------|
| Unified Platform Foundation | Coherent; shell/stores/catalog intact |
| Knowledge Platform | Sample catalog labeled; merge-load hardened |
| WOS + extensions | Extensions preserved on normalize + module merge |
| OIP / location | Silent Pike fallback removed on hard failure; Kansas bbox narrowed |
| Future data | Remains disabled |
| Fieldry Life List MVP | Boot race fixed |

---

## Defects found (selected)

| Severity | Finding |
|----------|---------|
| Critical | Fieldry/ForageCast captured `WDS.appBoot` before loader finished → permanent null boot |
| Critical | WOS core hard-replaced `WDS.observations`, wiping `.extensions` if loaded earlier |
| Critical | Kansas state bbox treated nearly all KS caches as invalid “test” coords |
| High | OIP `get()` catch silently built Pike County fallback packages |
| High | RI/OIP location resolve silently defaulted to Pike without opt-in |
| High | Knowledge core hard-replace could drop `search`/`related` |
| High | OIP/RI `location.onChange` re-bound on reload → duplicate refreshes |
| Medium | Reflected XSS risk in species `profile-boot.js` (`?id=` into HTML) |
| Medium | Unescaped `photo.id` attributes in Scenes photography UI |
| Medium | Platform unit tests not in CI; smoke route coverage incomplete |
| Medium | Engine `data/*.json` / status HTML churn pollutes working tree |
| Low | Favorites dual-read (widgets-v4 vs favorites-v1) retained intentionally |
| Low | Photo Coach legacy + growth storage retained intentionally |

---

## Defects fixed

1. Lazy `waitForAppBoot` / `getBoot` for Fieldry and ForageCast (Photo Coach pattern)
2. `wds-wos-core.js` merge-assigns and preserves `.extensions`
3. `wds-platform.js` loads `wds-wos-extensions.js` after core
4. `isKnownTestCoords` only rejects engine publish point (US center), not Kansas bbox
5. OIP failure returns unavailable package — no silent Pike substitution
6. Location resolve requires `allowDefaultLocation: true` for defaults
7. Knowledge core merge-assigns and re-attaches search/related
8. Once-guards on OIP/RI location listeners
9. Escape HTML for species profile id + photo ids
10. Shared min touch-target CSS for `.wds-btn` / topnav
11. Expanded smoke routes + CI unit tests
12. Storage inventory + this audit document

---

## Stability improvements

- Safer script load order for app boots
- Idempotent listener binding
- Honest unavailable states instead of fake geography
- Hardening regression suite (`automation/test-platform-hardening.mjs`)

---

## Privacy / security findings

- No committed cloud API secrets found
- Precise Fieldry coordinates remain gated by location precision UI
- XSS hotspots above fixed; remaining `innerHTML` paths generally escape
- Future-data / marketplace hooks remain disabled
- **Limitation:** Client-only privacy; true enforcement needs backend (deferred)

---

## Storage and migration work

- Documented inventory: `docs/STORAGE-INVENTORY.md`
- Fieldry corrupt JSON remains non-destructive
- Photo Coach dual families **retained** (risky to consolidate this sprint)

---

## Accessibility improvements

- Shared 44px minimum touch targets for primary buttons/nav links
- Existing skip link + `:focus-visible` retained
- Location prompt already uses `aria-live` status

---

## Performance

- Low-risk: prevent duplicate OIP/RI refresh listeners
- No bundler migration
- Dual RI v1/v2 stack retained (documented debt)

---

## Routes verified (automated smoke list)

Homepage, kiosk, status, debug, ForageCast, Fieldry, Waypoint Scenes, Scenes landing, Photo Coach + profile, Sheds, Steepleaf, SignalTerrain, Savant, Terrainbound redirect, species profile.

Asset path spot-check across HTML entries: no missing local JS/CSS references found during audit.

---

## Tests — verification commands

```bash
node automation/test-platform-hardening.mjs
node automation/test-platform-foundation.mjs
node automation/test-knowledge-platform.mjs
node automation/test-fieldry-mvp.mjs
node automation/test-photographer-profile.mjs
node automation/test-personalized-coaching.mjs
node scripts/validate-location.mjs
node scripts/validate-dashboard-data.mjs
node scripts/validate-surface-consistency.mjs
node scripts/validate-location-sensitive.mjs
# With static server + Chrome:
# node automation/smoke-browser.mjs http://127.0.0.1:8080
# node automation/test-kiosk-location-boot.mjs http://127.0.0.1:8080
```

---

## Remaining risks / deferred work

1. Photo Coach legacy vs growth storage consolidation
2. Dashboard favorites dual-read cleanup
3. Regional intelligence v1/v2 dedupe
4. Weather in-flight request dedupe
5. National educational honesty outside Pike editorial zone
6. Foundation pages without `?v=` cache busting
7. Untracking generated `data/live.json` / status.html from git (ops publish model)
8. Full headless smoke requires Chrome in environment
9. Kiosk still fetches `live.json` (must remain guard-sanitized)

---

## Recommended next sprint

Dashboard national-mode honesty + weather request coalescing; Photo Coach storage consolidation with dual-read migration; optional remove RI v1 from loader after call-site audit.
