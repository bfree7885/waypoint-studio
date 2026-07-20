# Dashboard V2 — Test Plan

## Automated (in repo)

| Suite | Command | Coverage |
|-------|---------|----------|
| V2 unit | `node automation/test-dashboard-v2.mjs` | model, briefing, activity, timeline, render, cache, flag |
| Reliability | `node automation/test-dashboard-reliability.mjs` | tags, settle, offline (unchanged) |
| Smoke | `node automation/smoke-browser.mjs` | routes, shell (manual extend for V2 selectors) |
| Mobile layout | `node automation/mobile-layout.mjs` | viewport checks |

## Playwright (recommended, not yet in repo)

- Location denied → graceful header
- Cached startup → partial briefing note
- Provider failure combo (weather off, alerts on)
- No network request to `0,0`
- No infinite `aria-busy` on shell

## Manual matrix

- [ ] Desktop 1280px
- [ ] Mobile 375px / 390px
- [ ] Location granted / denied
- [ ] Offline + cache / offline without cache
- [ ] Rapid refresh / location switch
- [ ] Console clean during normal load

## Failure scenarios

Simulate via DevTools: block Open-Meteo, block NWS, block USGS — dashboard must remain usable with partial briefing.
