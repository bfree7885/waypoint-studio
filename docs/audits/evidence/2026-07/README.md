# Audit evidence index — 2026-07

## Screenshots

Directory: `docs/audits/evidence/2026-07/screenshots/`  
Manifest: `docs/audits/evidence/2026-07/json/screenshot-manifest.json`  
Count: **44**

Naming: `{product}__{route-id}__{viewport}.png`

Products covered: dashboard, scenes, sheds, platform.  
Viewports include 390×844 and 1440×1000 for every primary route, plus Dashboard matrix 320–1920.

## Machine-readable JSON

| File | Contents |
| --- | --- |
| `crawl-summary.json` | Route/link totals, unfinished list, production build-info |
| `route-results.json` | Per-route HTTP/status/flags |
| `link-extract.json` | All extracted hrefs |
| `link-probe.json` | Destination probes |
| `broken-links.json` | Broken destinations (empty this run) |
| `browser-route-findings.json` | Per-route browser measures |
| `browser-console-errors.json` | Console errors (empty this run) |
| `browser-failed-requests.json` | Failed network (favicon 404) |
| `a11y-home-snapshot.json` | Home DOM a11y heuristics |
| `screenshot-manifest.json` | Screenshot list |

## Tooling

- `automation/audit-production-crawl.mjs`
- `automation/audit-production-browser.mjs`

## Not retained

Raw Chrome profiles, large HAR files, credentials, node_modules.
