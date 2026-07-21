# RC3 Consolidation — Safety, Backup & Preparation Report

**Phase:** Safety / backup / preparation only  
**Date:** 2026-07-20  
**Canonical repo:** `bfree7885/waypoint-studio`  
**RC3 source:** `bfree7885/waypoint-studio-site` branch `rc3`  
**Strategy:** Option A (preserve `/apps/*` platform; port RC3 constitution/IA/visual direction later)

**This phase did not:** change production behavior, redesign the homepage, migrate RC3 product code, deploy, alter DNS/CNAME/Pages settings, or merge into `main`.

---

## 1. Safe working copies

| Path | Remote | Branch | HEAD | Tracking | Tree | Nested? | `.tmp-audit`? |
|------|--------|--------|------|----------|------|---------|---------------|
| `/home/bryan/Projects/waypoint-studio` | `https://github.com/bfree7885/waypoint-studio.git` | `recovery/rc3-consolidation` (was clean `main`) | `f68c5b2ef1a1d40eaa979ea71088451096fb5c33` | `origin/recovery/rc3-consolidation` | clean except `docs/consolidation/` + prep docs | **No** | **No** |
| `/home/bryan/Projects/waypoint-studio-site` | `https://github.com/bfree7885/waypoint-studio-site.git` | `rc3` | `508b7830dd631c1e9c12cf8fbaa44785566b0625` | `origin/rc3` | untracked recovery PDFs/docs + partial Scenes JS (preserved; not discarded) | **No** | **No** |

### Unsafe / non-production copies (do not use)

| Path | Notes |
|------|--------|
| `/home/bryan/Projects/waypoint-studio-site/.tmp-audit/waypoint-studio/` | Nested audit clone inside site repo. **Never promote** to production working copy. |

### Local-only / uncommitted work preserved

**waypoint-studio:** none at start of phase (clean `main` == `origin/main`).

**waypoint-studio-site (`rc3`):** untracked files left untouched:

- `docs/CANONICAL-REPOSITORY-DECISION.md`
- `docs/RC3-RECOVERY-REPORT*.md` / PDF / RECOVERY-*.md
- `waypoint-scenes/experience.html`, `waypoint-scenes/js/*` (incomplete Scenes 3.0 WIP)

**Local-only commits on site vs `origin/main`:** three commits on `rc3` (already on `origin/rc3`): `68e79f8`, `539f896`, `508b783`.

---

## 2. Remote verification

### waypoint-studio

- Default branch: `main`
- `origin/main` = `f68c5b2`
- Local `main` = `f68c5b2` (0 ahead / 0 behind)
- GitHub Pages: `build_type=workflow`, **cname=`waypointstudio.org`**, source branch `main`, status `built`
- Latest Pages deployment SHA: **`f68c5b2`** (2026-07-20T19:46:29Z) — matches production tip

### waypoint-studio-site

- `origin/main` = `5931a04`
- `origin/rc3` = `508b783`
- Ahead/behind `main...rc3`: **0 behind / 3 ahead**

---

## 3. Production protection (created & pushed)

| Ref | Type | SHA | Remote |
|-----|------|-----|--------|
| `backup/pre-rc3-consolidation` | branch | `f68c5b2` | pushed `origin/backup/pre-rc3-consolidation` |
| `pre-rc3-consolidation-2026-07` | annotated tag | `f68c5b2` | pushed |
| `recovery/rc3-consolidation` | migration branch | `f68c5b2` | pushed `origin/recovery/rc3-consolidation` |

Tag annotation marks production state before RC3 consolidation. **`main` unchanged.**

### Rollback (future)

```bash
cd ~/Projects/waypoint-studio
git fetch origin
git checkout main
# emergency revert of a merged consolidation (NEXT PHASE ONLY — not executed now):
# git revert <consolidation-merge-sha>   # preferred
# or hard reset ONLY with explicit owner approval: git reset --hard pre-rc3-consolidation-2026-07
```

---

## 4. Migration branch rule

All future consolidation commits land on:

**`recovery/rc3-consolidation`**

Do not merge RC3 into this branch as a wholesale tree merge. Port selected items per the Manifest.

---

## 5. Canonical baseline inventory (high level)

See also:

- `docs/consolidation/INVENTORY-waypoint-studio-SUMMARY.md`
- `docs/consolidation/INVENTORY-waypoint-studio.json`

| Area | Path(s) |
|------|---------|
| Homepage | `index.html` |
| Dashboard redirect/shell | `dashboard.html`, `apps/dashboard/` |
| Scenes | `apps/scenes/`, `apps/waypoint-scenes/` |
| Photo Coach / Shoot Review | `apps/photo-coach/` (+ scenes photographer-profile / scene-builder) |
| Sheds | `apps/shed-hunting/` |
| Volunteer | `apps/waypoint-volunteer/` |
| Articles | `articles/` |
| Waypoint’s Take | `design-system/js/dashboard/v2/*take*`, `v3/wds-dashboard-v3-take.js`, OIE briefs |
| SignalTerrain | `apps/signalterrain/` |
| Steepleaf | `apps/steepleaf/` |
| Savant Sommelier | `apps/savant-sommelier/` |
| ForageCast | `apps/foragecast/` |
| Fieldry | `apps/fieldry/` |
| Landscape Interpretation | `apps/landscape-interpretation/` |
| Hidden Landscapes | `apps/hidden-landscapes/` |
| Design system (WDS) | `design-system/` |
| Shared CSS | `css/`, `design-system/css/` |
| Settings / privacy / contact | `settings.html`, `privacy.html`, `contact.html`, `support.html` |
| Kiosk | `kiosk.html` |
| CNAME | `CNAME` → `waypointstudio.org` |
| robots / sitemap | `robots.txt`, `sitemap.xml` |
| Workflows | `.github/workflows/ci.yml`, `pages.yml` |
| Automation / tests | `automation/*.mjs` |
| Build metadata scripts | `scripts/inject-build-metadata.mjs` |

**Homepage mission today (production):** “Observe. Understand. Create. Share.” — **not** yet RC3 Discover.

**Homepage IA today:** multi-card launcher including Fieldry, ForageCast, SignalTerrain, Steepleaf, Savant Sommelier as Launch cards — conflicts with RC3 primary hierarchy.

---

## 6. RC3 source inventory (high level)

See:

- `docs/consolidation/INVENTORY-waypoint-studio-site-rc3-SUMMARY.md`
- `docs/consolidation/INVENTORY-waypoint-studio-site-rc3.json`

| Area | Path(s) on `rc3` | Classification hint |
|------|------------------|---------------------|
| Constitution | `docs/RC3-CONSTITUTION.md` | conceptually + strategically valuable |
| Products / Nav / Incubator docs | `docs/PRODUCTS.md`, `NAVIGATION-PLAN.md`, `INCUBATOR.md` | valuable — port concepts |
| Aurora tokens/components | `styles/aurora-tokens.css`, `styles/aurora.css`, `design-system/` | visually valuable; **ADAPT** into WDS (do not replace WDS wholesale) |
| Homepage IA | `index.html` | valuable hierarchy; **shallower** than A’s platform — **MERGE CONCEPTS** not blind copy |
| Dashboard 3.0 | `dashboard/` | valuable UX patterns; **shallower** than `apps/dashboard` + WDS OIE — **ADAPT** / **MERGE CONCEPTS** |
| Sheds 3.0 | `sheds/` | education/Take/layers valuable; map stack shallower than `apps/shed-hunting` — **ADAPT** |
| Volunteer | `volunteer/` | demo catalog; A’s Volunteer deeper — **MERGE CONCEPTS** |
| Articles | `education/` | framework; A has `articles/` — **MERGE CONCEPTS** |
| Incubator page | `incubator/` | valuable demotion pattern — **PORT** concept |
| Scenes | `waypoint-scenes/` | immersive demo; A has deeper Photo Coach — **DO NOT COPY** over Coach |
| Incomplete Scenes WIP (untracked) | `waypoint-scenes/js/*` | **REQUIRES OWNER REVIEW** |

---

## 7. Baseline testing (pre-migration)

Recorded in `docs/consolidation/BASELINE-TEST-RESULTS.md`.

| Command | Result |
|---------|--------|
| `node scripts/inject-build-metadata.mjs` | PASS (then restored dirtied HTML) |
| `node automation/validate-production-assets.mjs` | PASS |
| `node automation/validate-production-links.mjs` | PASS |
| `node automation/test-production-recovery.mjs` | PASS |
| `node automation/test-production-repair.mjs` | PASS |
| `node automation/test-platform-foundation.mjs` | PASS |

**Not run in this phase (CI-only / heavier):** headless Chrome smoke (`automation/smoke-browser.mjs`), mobile layout, full CI matrix. No package.json at repo root — Node scripts are invoked directly as in `.github/workflows/ci.yml`.

**Predating migration:** N/A for failures (all listed commands passed).

---

## 8. Next phase gate

Proceed only after owner review of:

1. `docs/RC3-CONSOLIDATION-MANIFEST.md`
2. Migration order in that document
3. Confirmation that `recovery/rc3-consolidation` remains the only write branch

**Still forbidden until explicitly approved:** homepage redesign implementation, DNS/CNAME/Pages changes, merge to `main`, deploy.
