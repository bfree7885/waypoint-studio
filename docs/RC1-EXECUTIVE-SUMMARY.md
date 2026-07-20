# Executive Summary — Release Candidate Sprint 10

**Date:** 2026-07-19  
**Scope:** Platform-wide release readiness after Production Recovery sprints 1–9  
**Method:** Live Playwright QA baseline (2026-07-19) + recovery docs + automation suite + code verification of P0/P1 repairs  
**Constraint:** Assessment sprint — no major features; two gate fixes only (home Contact link; LI Learn resilience script)

---

## Bottom line

**Waypoint Studio is not ready for public Release Candidate 1.**

It **is** ready for a carefully framed **Closed Beta** after the critical gate items below are confirmed on production.

---

## Final decision (ONE)

### **B) Ready for Closed Beta after fixing listed critical issues**

Not **A** (RC1 / public): systemic accessibility contrast failures, heavy Dashboard/ForageCast cold starts, demo/sample catalogs, and no post-recovery live Playwright re-audit of production.

Not **C** (another full recovery cycle): sprints 1–9 already addressed the audit’s P0/P1 trust breakers in the recovery tree; remaining work is gate verification plus a focused quality cycle, not a restart.

Not **D** (major architecture): shells navigate, shared design system exists, observation/volunteer/LI models are coherent enough for closed beta.

---

## Evidence in one page

| Fact | Evidence |
| --- | --- |
| Pre-recovery production was closed-beta-ish, not public | Live QA overall **~6.2**; recommendation #3 |
| P0 `/map/` 404 fixed in tree | `map/index.html` → Sheds map |
| P1 Dashboard live/health paths + NWS 0,0 fixed in tree | `/data/live.json`, `/data/health.json`; NWS null-guard |
| P1 ForageCast “NULL, NY” fixed in tree | `sanitizePlaceLabel` / `formatRegionLabel` |
| P1 Steepleaf / ForageCast stuck boots mitigated in tree | `platformBoot.watch` + fail/retry |
| Recovery automation largely green | Sprints 1–9 tests pass; platform reliability + contact re-verified after gate fixes |
| Live production **not re-audited** after deploy | Only 2026-07-19 baseline exists |
| Accessibility still fails WCAG contrast at scale | axe: **color-contrast on ~102 routes** |
| Several apps never recovered | Scenes suite, Photo Coach, Photo Library, Animal Vision |

---

## Critical gate (must clear before Closed Beta invite)

1. **Production smoke:** `/map/` redirects; Dashboard does not request app-relative `data/live.json`; ForageCast never shows `NULL, NY`; Steepleaf explore/entity and ForageCast season-table exit boot or show Retry.
2. **Confirm `/data/live.json` and `/data/health.json` are served** on the live host (files exist in repo).
3. **Closed-beta framing** in invite: sample/demo catalogs, educational estimates, private-first notebooks — not management software, not GIS land history, not public scores.
4. **Ship the Sprint 10 gate fixes** (home Contact link; LI Learn resilience) with the next deploy.

---

## What Closed Beta should include

Studio Home · Dashboard (Today Outside) · Fieldry · Sheds map · ForageCast · Steepleaf · Savant · SignalTerrain Cyber Live · Volunteer Discover · Landscape Interpretation (educational) · Scenes / Photo Coach / Photo Library (as-is) · Knowledge / About / Privacy / Contact / Support

**Hold from marketing claims:** live regional Volunteer feeds · LI as verified history · Sheds photos · public “RC1” label

---

## What public RC1 still needs (next cycle — not this decision)

- Platform contrast remediation (tokens + Knowledge page density)
- Dashboard / ForageCast cold-start budget (bundle/provider strategy)
- Live Playwright re-audit green on P0/P1
- Photo attach in Fieldry/Sheds (if marketed as field products)
- Consistency pass on unsprinted Scenes apps

See companion reports in this folder for scorecards, debt, and roadmap.
