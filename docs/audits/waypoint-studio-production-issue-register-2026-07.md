# Production Issue Register — Waypoint Studio (2026-07)

Severity: **P0** critical · **P1** high · **P2** medium · **P3** low  
Effort: XS / S / M / L / XL

Counts: **P0=0 · P1=8 · P2=14 · P3=11**

---

## P1 — High

### P1-001 — Dashboard catalog too thin for product claim
- **Product:** Dashboard · **Route:** `/` · **Feature:** Catalog / customize
- **Repro:** Open Customize; count selectable instruments → 5.
- **Expected:** Meaningful multi-category outdoor workspace.
- **Actual:** Five tiles; little choice.
- **Evidence:** Production registry v3.3.0; screenshots `dashboard__dashboard-customize__*`.
- **Root cause:** Catalog intentionally pruned to functional tiles; expansion unmerged.
- **Fix:** Merge-gate and ship `feature/dashboard-functional-tile-catalog` (32 tiles) or equivalent.
- **Effort:** L · **Sprint:** B1

### P1-002 — Dead Dashboard eras loaded on every Home request
- **Product:** Platform/Dashboard · **Route:** `/`
- **Repro:** Inspect `wds.js` module list — 164 files; 76 dashboard-related; only Rebuild mounts.
- **Expected:** Load only canonical Rebuild + shared services.
- **Actual:** OS/V2/V3/Recovery/V1 still registered.
- **Evidence:** `design-system/js/wds.js`; explore audit.
- **Fix:** Loader trim Phase 1; keep files in repo but stop shipping on Home.
- **Effort:** M · **Sprint:** A2

### P1-003 — Scenes portfolio suite 404 on production
- **Product:** Scenes · **Routes:** `/apps/scenes/portfolio/*`
- **Repro:** Fetch portfolio URLs → 404.
- **Expected:** If marketed, live; if not, no dangling expectations.
- **Actual:** Substantial feature-branch work not on main.
- **Fix:** Either merge a thin production slice or purge nav/docs that imply presence.
- **Effort:** L · **Sprint:** D1

### P1-004 — Living Scenes pillar is preview-only
- **Product:** Scenes · **Route:** `/apps/scenes/living-scenes/`
- **Repro:** Open route → “Future experience”, no controls.
- **Expected:** Create pillar available, or not presented as a product path.
- **Fix:** Demote from primary journey until AnimationEngine is real; or ship minimal motion MVP.
- **Effort:** M–XL · **Sprint:** D2 / stop-condition

### P1-005 — Importer cannot open shoot in Scenes
- **Product:** Importer → Scenes
- **Repro:** Complete desktop import; “Analyze in Photo Coach (coming soon)”.
- **Expected:** One-click handoff to Shoot Review.
- **Actual:** Stub only (`photo-coach-importer-bridge.js` unwired).
- **Fix:** Wire bridge + session file/protocol; E2E test.
- **Effort:** L · **Sprint:** C2

### P1-006 — Light / sun-dependent tiles fail under NWS fallback
- **Product:** Dashboard · **Tiles:** Light (+ future golden/blue)
- **Repro:** When `weatherRef.meta.provider === nws`, sunrise/sunset often null → Light Unavailable while Conditions Live.
- **Expected:** Sun times from local calculation when provider omits them.
- **Fix:** Client solar calculation from lat/lon/date.
- **Effort:** M · **Sprint:** B2

### P1-007 — Sheds map tile paint unreliable
- **Product:** Sheds · **Route:** `/apps/shed-hunting/map/`
- **Repro:** Clean browser open map; observe fragmented/blank tile regions during audit capture; location off.
- **Expected:** Stable basemap for primary field product.
- **Actual:** Incomplete tile coverage + location-off state.
- **Evidence:** `sheds__sheds-map__1440x1000.png`
- **Fix:** Diagnose OSM/OTM failures, loading order, ethics-modal timing; add health check.
- **Effort:** M · **Sprint:** A1 / E0

### P1-008 — Public operator surfaces (status/debug) reachable
- **Product:** Platform · **Routes:** `/status.html`, `/debug.html`
- **Repro:** Fetch without auth → 200.
- **Expected:** Operator tools private or authenticated.
- **Actual:** robots Disallow only.
- **Fix:** Exclude from Pages artifact or gate; keep fingerprints via `build-info` only.
- **Effort:** S · **Sprint:** A1

---

## P2 — Medium

| ID | Product | Summary | Effort | Sprint |
| --- | --- | --- | --- | --- |
| P2-001 | Dashboard | Alerts empty shows trust “Waiting” while message says no alerts | S | B2 |
| P2-002 | Dashboard | Astronomy “Moonrise — Not reported” is noise | S | B2 |
| P2-003 | Support | “Coming later” incubator card on Support | XS | A1 |
| P2-004 | Scenes | Legacy `apps/waypoint-scenes/` still promoted | M | A2 |
| P2-005 | Scenes | Photo Coach CSS depends on monolith paths | M | A2 |
| P2-006 | Platform | Missing CSP / X-Frame-Options / X-Content-Type-Options | S | A1 |
| P2-007 | Platform | Favicon 404 | XS | A1 |
| P2-008 | Platform | Cache-bust token inconsistency (`local` vs SHA vs dash-tile-layout-1) | S | A2 |
| P2-009 | Dashboard | Customize mobile DOM reports duplicate widget nodes (measurement/selector risk) | S | B2 |
| P2-010 | Scenes | Outdoor Journals absent while Remember pillar expected | L | D2 |
| P2-011 | Importer | No safe-eject action | M | C1 |
| P2-012 | Importer | No automated Python GUI test suite | M | C1 |
| P2-013 | Sheds | Primary nav presents Sheds equal to Scenes despite foundation maturity | S | A1 |
| P2-014 | Docs | DEPRECATED_RENDER_PATHS / some owner reviews still name Outdoor OS canonical | S | A2 |

---

## P3 — Low

| ID | Summary | Effort | Sprint |
| --- | --- | --- | --- |
| P3-001 | Article “Sample” wording in deepeners | XS | polish |
| P3-002 | Dashboard vs Scenes accent systems differ | S | polish |
| P3-003 | Kiosk dual implementation (standalone V3 vs Rebuild) | M | later |
| P3-004 | Recovery stub still loaded | XS | A2 |
| P3-005 | Incubator apps still fully public (acceptable if framed) | — | policy |
| P3-006 | CORS `Access-Control-Allow-Origin: *` on Pages | S | A1 |
| P3-007 | Reports HTML publicly reachable | S | A1 |
| P3-008 | Contact depends on third-party FormSubmit | S | later |
| P3-009 | Support lists Planned apps in Known Limitations (honest but noisy) | XS | polish |
| P3-010 | Deep WCAG pass incomplete for Coach/Sheds | M | B3 / D3 |
| P3-011 | Lighthouse CI not part of this audit run | S | A2 |

---

## P0

None confirmed. Production is reachable; no exposed secrets found; no destructive public workflows identified.

---

## Emergency fixes during audit

**None.** Audit-only tooling and reports committed on the audit branch.
