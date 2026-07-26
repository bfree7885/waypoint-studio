# Turnaround Sprint 2 — Public Surface Cleanup

**Date:** 2026-07-26  
**Branch:** `turnaround/sprint-02-public-surface-cleanup`  
**Base:** `origin/main` @ `59c09de`  
**Scope:** Public surface cleanup only — no catalog merge, no deploy.

Audit issues addressed: **P1-008**, **P2-003**, **P2-007**, **P3-007** (public reports / owner-review surfaces).

---

## Summary

Public visitors no longer see unfinished “Coming later” Support promotion, operational Live Engine dumps, or a missing `/favicon.ico`. Incubator remains reachable as a clearly experimental secondary area. Owner-review / audit / turnaround docs and operator tooling are excluded from the Pages artifact.

---

## Routes removed or reframed

| Surface | Change |
| --- | --- |
| `/favicon.ico` | **Added** multi-size ICO (16/32/48); returns 200 with valid ICO magic |
| `/support.html` | Removed “Coming later” / Incubator card; Experiences now include Contact |
| `/about.html` | “Coming later” → “Incubator (experimental)” |
| `/404.html` | Removed Incubator / “Coming later” from primary recovery links |
| `/incubator/` | Reframed as **Experimental**; preview links labeled honestly; `noindex` |
| Home (`js/studio-home.js`) | Incubator section → “Experimental incubator” |
| `/status.html` | Replaced operational dump with **non-sensitive operator stub** |
| `/debug.html` | Replaced operational dump with **non-sensitive operator stub** |
| Full operator HTML | Written to `private/operator/` only (excluded from Pages) |
| Pages artifact | Removes `private/`, `audits/`, `reports/`, `automation/`, `scripts/`, `engineering/`, rebuild/audit/turnaround/archive docs, and `*owner-review*` files |

**Not removed (intentionally):** experimental Incubator route; Living Scenes “Future experience” honesty; planned-feature labels inside product UIs.

---

## Files changed (product + deploy)

- `favicon.ico` (new)
- `index.html`, `support.html`, `about.html`, `404.html`, `contact.html`, `privacy.html`, `terms.html`, `settings.html` — favicon links / copy
- `incubator/index.html` — experimental framing
- `js/studio-home.js` — secondary incubator wording
- `status.html`, `debug.html` — public stubs
- `private/operator/README.md` — operator strategy note
- `.github/workflows/pages.yml` — broader public-surface exclusions
- `scripts/waypoint-live-engine.mjs` — write full status/debug under `private/operator/`
- `scripts/publish-live-engine-artifacts.mjs` — stop publishing status/debug HTML
- `engineering/production/monitors.yaml` — health via `data/health.json` (not operational status HTML)
- `robots.txt` — disallow reports + internal docs paths
- `automation/validate-production-assets.mjs` — require `favicon.ico`
- `automation/smoke-browser.mjs` — expect operator stubs
- `automation/capture-sprint-02-public-surface.mjs` — evidence crawl + screenshots
- `docs/turnaround/2026-07-26-sprint-02/*` — screenshots + verification
- `docs/ENGINEERING-PLAYBOOK.md` — lesson
- Regenerated: `docs/PRODUCTION-ASSET-AUDIT.md`, `docs/PRODUCTION-BROKEN-ROUTE-REPORT.md`

---

## Testing

| Check | Result |
| --- | --- |
| `validate-production-assets.mjs` | OK — 555 HTML refs, 54 CSS imports, 164 JS modules, **0 missing** |
| `validate-production-links.mjs` | OK — **1688** local refs checked, **0 broken** (6 pre-existing article busy-mount warnings) |
| Sprint-2 public crawl | **90** reachable same-origin HTML links from `/`, **0 broken** |
| Favicon probe | **200**, 2338 bytes, ICO magic `00 00 01 00` |
| Direct `/status.html` / `/debug.html` | 200 stubs; no raw snapshot / module dump |
| Support “Coming later” | **Absent** |
| `test-home-rc1.mjs` | **54/54 pass** |
| Browser smoke (home, support, status, debug, favicon) | **Pass** |
| Localhost / preview URL leaks in crawl | **None** (local server only for evidence) |

---

## Screenshots

Evidence directory: `docs/turnaround/2026-07-26-sprint-02/`

| Capture | Files |
| --- | --- |
| Home | `home__desktop.png`, `home__mobile.png` |
| Footer | `footer__desktop.png`, `footer__mobile.png` |
| Support | `support__desktop.png`, `support__mobile.png` |
| Incubator | `incubator__desktop.png`, `incubator__mobile.png` |
| Status / debug probes | `status__*.png`, `debug__*.png` |
| Favicon | `favicon.ico.copy`, `favicon-context__desktop.png` |
| Machine JSON | `verification.json`, `crawl-results.json` |

---

## Conflict / deploy notes

- **Do not merge or deploy in this sprint** (owner gate next).
- After deploy, production `/favicon.ico` should flip from 404 → 200.
- Public `/status.html` and `/debug.html` will show stubs (not engine dumps). Machine health remains at `/data/health.json`.
- Live-engine publish no longer commits status/debug HTML to `main`.

---

## Recommended next step

Owner review this branch, then merge to `main` and deploy Pages. Sprint 3 can proceed to Dashboard catalog integration from Sprint 1’s recommended tip (`c7b2525`).
