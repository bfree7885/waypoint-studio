# Dashboard V2 — Implementation Plan

## Phase 0 — Baseline (done)

- [x] Document V1 entry points and providers
- [x] Identify safe extension points (recovery shell, OIP readers)

## Phase 1 — Core engines (done)

- [x] `v2/wds-dashboard-v2-model.js` — normalized contracts + location sanitization
- [x] `v2/wds-dashboard-v2-briefing.js` — deterministic Today Outside
- [x] `v2/wds-dashboard-v2-activity.js` — activities + time windows
- [x] `v2/wds-dashboard-v2-timeline.js` — 24h timeline
- [x] `v2/wds-dashboard-v2-observe.js` — Observe Today cards
- [x] `v2/wds-dashboard-v2-trust.js` — provider rows + briefing cache
- [x] `v2/wds-dashboard-v2-prefs.js` — local preferences
- [x] `v2/wds-dashboard-v2-render.js` — HTML renderers
- [x] `v2/wds-dashboard-v2.js` — orchestrator + feature flag

## Phase 2 — Integration (done)

- [x] Wire modules in `wds.js` before recovery
- [x] Recovery shell prepends V2 when enabled
- [x] V2 bind: panel shortcuts, refresh hook
- [x] CSS `wds-dashboard-v2.css` + dashboard `index.html` link

## Phase 3 — Quality (partial)

- [x] Unit tests `automation/test-dashboard-v2.mjs`
- [x] Existing reliability suite still passes
- [ ] Playwright workflows (blocked: no Playwright in repo)
- [ ] Owner manual mobile soak on real device
- [ ] CDP smoke update for V2 selectors

## Phase 4 — Follow-up

- [ ] Settings UI for V2 prefs (activities, sensitivity)
- [ ] Incremental briefing refresh without full re-render
- [ ] Worker offload if library grows
- [ ] Playwright adoption per TEST-PLAN.md
