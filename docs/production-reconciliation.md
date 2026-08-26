# Production reconciliation audit — Waypoint Studio

**Superseded for portfolio decisions.** OpenRoad, SignalTerrain, and Global Signals
are deleted product identities. Canonical: [`PRODUCT-DIRECTION.md`](PRODUCT-DIRECTION.md).

**Date:** 2026-08-06 (audit window; live probes 2026-08-07T03:23Z UTC)  
**Repo:** `bfree7885/waypoint-studio`  
**Live:** https://waypointstudio.org  
**Branch for this report:** `docs/production-reconciliation`  
**Do not merge feature work from this audit.** Report only.

---

## Executive verdict

Production does **not** reflect recent Side Trails / SignalTerrain IA / Articles modernization / Global Signals work because that work lives on **unmerged feature branches**, not on `main`.

A smaller secondary lag exists: `origin/main` is **3 commits ahead** of the live Pages artifact (articles feed refresh commits). Those bot pushes did **not** trigger `pages.yml` (GitHub Actions `GITHUB_TOKEN` push does not re-trigger workflows).

---

## 1. Production vs main

| Surface | SHA (full) | Short | Evidence |
| --- | --- | --- | --- |
| **Production** | `4aa39b3a46b7846adb2ecc412740ff81e98d257b` | `4aa39b3` | `GET https://waypointstudio.org/data/build-info.json` (200); `<meta name="waypoint-build" content="4aa39b3">`; GitHub Pages deployment id `5769389197`; workflow run `31047040681` (“Deploy GitHub Pages”, 2026-08-05T21:04:22Z) |
| **`origin/main`** (after `git fetch --all --prune`) | `52c4656178c738baaa130dbf0d5b0b46d4cf2542` | `52c4656` | `git rev-parse origin/main`; tip message `chore(articles): refresh curated feed artifacts` |

### Methods used

- `curl` live `/data/build-info.json` and home HTML meta `waypoint-build`
- `gh api repos/bfree7885/waypoint-studio/pages` → `source.branch=main`, `status=built`, `cname=waypointstudio.org`
- `gh api .../deployments` (latest github-pages environment = `4aa39b3`)
- `gh run list --workflow=pages.yml` / `articles-refresh.yml`
- Deploy pipeline: `.github/workflows/pages.yml` (push to `main` + `workflow_dispatch`)

### Relationship

- Production SHA **is an ancestor** of `origin/main` (`git merge-base --is-ancestor 4aa39b3 origin/main` → yes).
- **`origin/main` is ahead of production by 3 commits** (all bot article refreshes):

  ```
  52c4656 chore(articles): refresh curated feed artifacts
  2945b27 chore(articles): refresh curated feed artifacts
  049ba58 chore(articles): refresh curated feed artifacts
  ```

- **Production is not behind `main` on product features** — those features were never merged to `main`. Live `/side-trails/` returns **404**; `/apps/signalterrain/` still returns **200** (pre-existing app surface under `apps/`, unrelated to the new Side Trails catalog landing).

### Why production lags “completed work”

| Lag type | Cause | Severity for “recent completed work” |
| --- | --- | --- |
| **Feature lag** | Side Trails, nav architecture, SignalTerrain IA move, Articles modernization, Global Signals foundation/docs remain on feature branches with **Merged: No** in owner-review docs | **Primary** — explains missing Side Trails / nav / GS surfaces |
| **Pages data lag** | `articles-refresh.yml` commits with `GITHUB_TOKEN` / `github-actions[bot]`; no `pages.yml` runs for SHAs `049ba58`, `2945b27`, `52c4656` | **Secondary** — curated feed artifacts on `main` not republished; prod `data/articles/health.json` still `checkedAt: 2026-08-05T13:40:45Z` vs main `2026-08-07T02:01:29Z` |
| Wrong branch deployed | **No** — Pages source is `main` via GitHub Actions | N/A |
| Pages job failing on latest main | **No evidence** — last Pages success was intentional deploy of `4aa39b3`; later main pushes simply never started Pages | N/A |

---

## 2. Feature branches (last ~30 days)

Cutoff: **2026-07-07** → **2026-08-06/07** (`git for-each-ref` on `refs/remotes/origin`, unique short names).

**Unique `origin/*` refs with committerdate in window:** **67** (includes `main`).  
**Non-`main` refs:** **66**.

| Date | Branch | Tip | vs `origin/main` (behind/ahead) | Merged into main? |
| --- | ---: | --- | --- | --- |
| 2026-08-06 | `feature/signalterrain-move-to-side-trails` | `1629a2e` | 0 / 4 | no |
| 2026-08-06 | `feature/articles-design-modernization` | `128c829` | 0 / 8 | no |
| 2026-08-06 | `feature/studio-nav-architecture-alignment` | `d7072e6` | 0 / 7 | no |
| 2026-08-06 | `feature/global-signals-citizen-impact` | `9948a94` | 0 / 10 | no |
| 2026-08-06 | `feature/global-signals-cascading-impact` | `d28b5d7` | 0 / 12 | no |
| 2026-08-06 | `feature/global-signals-foundation` | `4389e51` | 0 / 11 | no |
| 2026-08-06 | `feature/global-signals-relationship-engine` | `e5a0eca` | 0 / 7 | no |
| 2026-08-06 | `feature/global-signals-articles` | `8361d89` | 0 / 6 | no |
| 2026-08-06 | `feature/global-signals-side-trails` | `f9b5d70` | 0 / 7 | no |
| 2026-08-06 | `feature/side-trails-production-integration` | `064c3ea` | 0 / 3 | no |
| 2026-08-06 | `turnaround/sprint-05-scenes-surface-cleanup` | `7acb457` | 13 / 517 | no |
| 2026-08-06 | `feature/signalterrain-intelligence-map-design` | `aa408fa` | 0 / 5 | no |
| 2026-08-06 | `feature/signalterrain-posture-engine-arch` | `dbd0f55` | 0 / 4 | no |
| 2026-08-06 | `feature/signalterrain-dashboard-mockup` | `a3fdd38` | 0 / 3 | no |
| 2026-08-06 | `feature/signalterrain-landing` | `1ed2203` | 0 / 2 | no |
| 2026-08-06 | `feature/side-trails-signalterrain` | `2c944cb` | 0 / 1 | no |
| 2026-08-07 | `main` | `52c4656` | 0 / 0 | yes (is main) |
| 2026-08-05 | `feature/outdoor-intelligence-engine` | `0bacbca` | 3 / 3 | no |
| 2026-08-05 | `review/waypoint-articles-release-gate` | `998687f` | 5 / 0 | **yes** |
| 2026-08-04 | `feature/waypoint-articles-rss-feed` | `aeccb76` | 8 / 0 | **yes** |
| 2026-08-04 | `feature/platform-polish` | `94d2f50` | 13 / 3 | no |
| 2026-08-04 | `docs/scenes-image-processing-engine` | `deff156` | 13 / 1 | no |
| 2026-08-04 | `feature/platform-consolidation` | `73ab3fd` | 13 / 5 | no |
| 2026-08-04 | `docs/scenes-import-workflow` | `37e2bd2` | 13 / 1 | no |
| 2026-08-04 | `docs/scenes-create-explore-architecture` | `f39ce46` | 13 / 1 | no |
| 2026-08-03 | `feature/scenes-learn-pillar-workflow` | `1ec9ba9` | 49 / 13 | no |
| 2026-08-03 | `docs/scenes-reconciliation-2026-08-03` | `42021de` | 13 / 1 | no |
| 2026-08-03 | `feature/dashboard-functional-tile-catalog` | `fe21ede` | 13 / 10 | no |
| 2026-08-03 | `feature/scenes-remember-pillar-foundation` | `ec5a03f` | 13 / 4 | no |
| 2026-08-03 | `audit/waypoint-studio-complete-status-2026-08-03` | `29f638c` | 13 / 1 | no |
| 2026-08-03 | `feature/scenes-photo-coach-2-architecture` | `9ae7891` | 49 / 9 | no |
| 2026-07-28 | `feature/production-route-consolidation` | `c4ece63` | 13 / 2 | no |
| 2026-07-26 | `turnaround/sprint-04-canonical-dashboard-loader` | `6db767a` | 13 / 3 | no |
| 2026-07-26 | `turnaround/sprint-03-security-hardening` | `3901080` | 13 / 2 | no |
| 2026-07-26 | `turnaround/sprint-02-public-surface-cleanup` | `60ad770` | 13 / 9 | no |
| 2026-07-26 | `turnaround/sprint-01-reconciliation` | `89c1ce0` | 13 / 1 | no |
| 2026-07-26 | `audit/waypoint-studio-complete-production-review-2026-07` | `80c9d11` | 13 / 34 | no |
| 2026-07-25 | `feature/rc4-platform-sprint1-unified-experience` | `0b019db` | 49 / 8 | no |
| 2026-07-25 | `fix/waypoint-coach-blurry-preview` | `64ac12a` | 49 / 6 | no |
| 2026-07-25 | `fix/dashboard-production-tile-layout` | `f6842b2` | 15 / 0 | **yes** |
| 2026-07-25 | `feature/scenes-portfolio-*` / `scenes-sprint*` / `dashboard-rc3-*` / backups / polish / recovery / integration (remaining window) | various | mostly behind main; many historical | mixed (several integration/recovery tips already ancestors of main) |

Full unique list was generated from `refs/remotes/origin` (67 entries). Historical dashboard/scenes/turnaround branches are listed for completeness; they are **not** the primary explanation for today’s Side Trails / GS gap.

Local mirrors of the same tips exist under `/home/bryan/Projects/waypoint-studio-*` worktrees (e.g. `waypoint-studio-st-prod`, `waypoint-studio-nav-arch2`, `waypoint-studio-side-trails`).

---

## 3. Category map

A branch can appear in multiple categories. Civic Trails product engineering is largely a **separate repo** (section 3.1).

### Side Trails (Waypoint Studio)

- `feature/side-trails-signalterrain`
- `feature/side-trails-production-integration`
- `feature/signalterrain-landing` (landing under `/side-trails/signalterrain/`)
- `feature/signalterrain-move-to-side-trails`
- `feature/studio-nav-architecture-alignment` (nav + Side Trails placement)
- `feature/articles-design-modernization` (carries Side Trails nav context)
- `feature/global-signals-*` (catalog membership / Side Trails project)

### SignalTerrain

- `feature/signalterrain-landing`
- `feature/signalterrain-dashboard-mockup`
- `feature/signalterrain-posture-engine-arch`
- `feature/signalterrain-intelligence-map-design`
- `feature/signalterrain-move-to-side-trails`
- `feature/side-trails-signalterrain` / `feature/side-trails-production-integration`
- Plus ST lineage embedded in nav / articles / global-signals branches

### Articles

- **Already on main / production (product):** `feature/waypoint-articles-rss-feed`, `review/waypoint-articles-release-gate` (merged; live Articles RSS exists)
- **Not on main:** `feature/articles-design-modernization`
- Related docs-only: `feature/global-signals-articles`

### Global Signals

- `feature/global-signals-side-trails`
- `feature/global-signals-foundation`
- `feature/global-signals-relationship-engine`
- `feature/global-signals-cascading-impact`
- `feature/global-signals-citizen-impact`
- `feature/global-signals-articles`

### Civic Trails

- **In Waypoint Studio:** discovery/catalog cards and links inside Side Trails branches (`data/side-trails/catalog.json`, assets) — **not** the Civic Trails application itself.
- **Separate repo:** `bfree7885/civic-trails` (see below).

### 3.1 Civic Trails — separate repositories

| Path | Role |
| --- | --- |
| `/home/bryan/Projects/civic-trails` | Clone of `https://github.com/bfree7885/civic-trails.git` |
| `/home/bryan/Projects/civic-trails-profiles` | Worktree on `feature/side-trails-showcase` (same remote; not a separate GitHub repo — `civic-trails-profiles` returned **404** on GitHub API) |

**GitHub default branch:** `feature/gis-platform` (`96d6828`). **No `origin/main`.**

Recent Civic Trails feature branches (30d), none merged into default `feature/gis-platform`:

| Branch | Tip | Ahead of default |
| --- | --- | --- |
| `feature/side-trails-showcase` | `ca35892` | 8 |
| `feature/side-trails-lifecycle` | `43e0854` | 7 |
| `feature/product-landing` | `0a74fd6` | 6 |
| `feature/side-trails-catalog` | `95edd17` | 5 |
| `feature/official-profiles` | `3819251` | 4 |
| `feature/live-activity` / `feature/first-official-live-connector` | `ca39f08` | 3 |
| `feature/official-profile` | `f21076a` | 2 |
| `feature/public-records-engine` | `4159cb4` | 1 |
| `feature/gis-platform` | `96d6828` | 0 (default) |

Civic Trails production deploy status for waypointstudio.org: **N/A** (different product/repo). Studio Side Trails only links/catalogs Civic Trails as a laboratory card.

---

## 4. Relevant branch deep dive

Conflict checks: `git merge-tree --write-tree --messages` against `origin/main` or between tips. **No merge state left in the working tree.**

Tests: run on matching worktrees where noted. “Owner review” = document present with an **Approve** / decision ask; **owner sign-off in git is not verified** beyond the written verdict.

### 4.1 Deployable / integration candidates

| Branch | Merged? | Behind/ahead main | Conflicts vs main | Conflicts vs peers | Deployable? | Owner review | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `feature/side-trails-production-integration` `064c3ea` | no | 0 / 3 | clean | **conflicts** with nav, articles, GS foundation (parallel Side Trails lineage) | **Yes** — static `/side-trails/` landing | Approve (not merged) | **PASS** `test-side-trails.mjs`, `test-signalterrain-landing.mjs` |
| `feature/signalterrain-move-to-side-trails` `1629a2e` | no | 0 / 4 | clean | **conflicts** with nav / articles (includes prod-integration tip) | **Yes** for IA move on top of Side Trails prod | Approve | **PASS** side-trails + `test-signalterrain-side-trails-move.mjs` |
| `feature/studio-nav-architecture-alignment` `d7072e6` | no | 0 / 7 | clean | **conflicts** with Side Trails prod / ST-move / articles / GS | **Yes** after rebase onto chosen Side Trails tip — do not merge divergent Side Trails twice | Approve | **PASS** `test-studio-nav-architecture.mjs` (48), side-trails |
| `feature/articles-design-modernization` `128c829` | no | 0 / 8 | clean | **conflicts** with nav / ST-move / Side Trails prod | **Yes** for Articles UI (feeds unchanged); carries nav+ST lineage | Decision needed / ask Approve | **PASS** `test-articles-rss.mjs` |
| `feature/global-signals-foundation` `4389e51` | no | 0 / 11 | clean | **conflicts** with Side Trails prod / nav / articles; also with cascading-impact tip | **Yes** as docs+catalog+placeholders (no live engines) | Approve foundation | **PASS** `test-global-signals.mjs`, side-trails (3 projects) |

### 4.2 SignalTerrain design / mockup branches

| Branch | Merged? | Ahead | vs main | Deployable? | Owner review | Tests |
| --- | --- | --- | --- | --- | --- | --- |
| `feature/side-trails-signalterrain` | no | 1 | clean | Partial (catalog only; superseded by prod-integration) | Approve | not re-run (subset of prod) |
| `feature/signalterrain-landing` | no | 2 | clean | Yes as static landing; lineage used by nav/GS | Approve | covered via prod / nav worktrees |
| `feature/signalterrain-dashboard-mockup` | no | 3 | clean | Mockups only | Approve (static) | not run this audit |
| `feature/signalterrain-posture-engine-arch` | no | 4 | clean | Docs only | Approve (docs) | not run |
| `feature/signalterrain-intelligence-map-design` | no | 5 | clean | Docs only | Approve (docs) | not run |

### 4.3 Global Signals satellite branches

| Branch | Merged? | Ahead | Notes |
| --- | --- | --- | --- |
| `feature/global-signals-side-trails` | no | 7 | Earlier GS Side Trails story; foundation is further ahead |
| `feature/global-signals-relationship-engine` | no | 7 | Docs/schematics; owner review Approve direction |
| `feature/global-signals-cascading-impact` | no | 12 | Docs; **conflicts** with foundation tip (parallel stamp history) |
| `feature/global-signals-citizen-impact` | no | 10 | Docs; owner review Approve direction |
| `feature/global-signals-articles` | no | 6 | Docs only; conflicts with side-trails GS on playbook |

Treat satellites as **docs packages to rebase onto foundation**, not independent product deploys.

### 4.4 Already merged Articles pipeline

| Branch | Merged? | Notes |
| --- | --- | --- |
| `feature/waypoint-articles-rss-feed` | **yes** | Tip ancestor of main; live Articles exist |
| `review/waypoint-articles-release-gate` | **yes** | Cadence/docs gate merged |

### 4.5 Lineage warning (critical for merge planning)

Two **parallel Side Trails implementations** exist:

1. **Landing lineage:** `side-trails-signalterrain` (`2c944cb`) → `signalterrain-landing` (`1ed2203`) → ST docs → **nav** / **articles** / **global-signals**
2. **Production-integration lineage:** rewritten tips `e84f8d9` / `0c10bf2` / `064c3ea` → **`signalterrain-move-to-side-trails`**

`git merge-base --is-ancestor` shows production-integration is **not** an ancestor of nav/articles, and landing is **not** an ancestor of production-integration. Pairwise `merge-tree` between those families reports **content and add/add conflicts** on `side-trails/*`, catalog JSON, and shared chrome files.

**Do not** sequentially merge both families onto main without an explicit reconciliation rebase.

---

## 5. Synthesis

### Root cause

1. **Primary:** Completed Side Trails / SignalTerrain IA / nav alignment / Articles modernization / Global Signals work was **owner-reviewed on feature branches and never merged to `main`**. GitHub Pages deploys only from `main` (`.github/workflows/pages.yml`). Therefore https://waypointstudio.org cannot show `/side-trails/` or the new IA until merges happen.
2. **Secondary:** Three `chore(articles): refresh curated feed artifacts` commits reached `origin/main` via Actions bot push but **did not start Pages** (no workflow runs for those head SHAs). Production fingerprint remains `4aa39b3` while main tip is `52c4656`.
3. **Not the cause:** Wrong Pages source branch; failed latest Pages build for feature work; Civic Trails repo default-branch churn (separate product).

### Recommended merge order (do **not** merge in this audit)

Ordered by dependency and risk. Prefer **rebase/reconcile onto one Side Trails tip** rather than merging conflicting parallel tips.

1. **Side Trails production** — `feature/side-trails-production-integration`  
   Lowest-risk public surface (`/side-trails/` Civic Trails + SignalTerrain catalog). Tests pass. Owner review Approve.

2. **SignalTerrain IA move** — `feature/signalterrain-move-to-side-trails`  
   Already stacks on (1). Establishes Studio → Side Trails → SignalTerrain. Tests pass.

3. **Nav architecture alignment** — rebase `feature/studio-nav-architecture-alignment` **onto (2)**  
   Do **not** merge the divergent landing-lineage Side Trails tree as-is. Keep nav/catalog/home changes; drop duplicate Side Trails file adds already present from (1)–(2). Owner review Approve.

4. **Articles modernization** — rebase `feature/articles-design-modernization` **onto (3)**  
   UI/Take/nav alignment only; feed contracts preserved. Resolve conflicts in About/Support/registries. Owner decision still required per review doc.

5. **Global Signals foundation (+ docs)** — rebase `feature/global-signals-foundation` **onto (4)** (or onto (3) if Articles is deferred), then fold docs satellites (`relationship-engine`, `cascading-impact`, `citizen-impact`, `articles`) as cherry-picks/rebases — **not** as parallel full-stack merges.

**Optional ops (no feature merge):** `workflow_dispatch` on `pages.yml` for current `main` to publish the three articles refresh commits; longer-term fix: use a PAT / `repository_dispatch` so articles-bot commits can trigger Pages (documented intent in `articles-refresh.yml` currently fails in practice).

### Out of scope for this production gap

- Civic Trails app branches in `bfree7885/civic-trails` (separate default branch, no Studio Pages coupling beyond catalog links)
- Historical scenes/dashboard/turnaround branches still open (behind main; not today’s Side Trails gap)

---

## Appendix — Fingerprints

```
Production build-info.json:
  commit: 4aa39b3a46b7846adb2ecc412740ff81e98d257b
  builtAt/deployedAt: 2026-08-05T21:04:36.600Z
  workflowRunId: 31047040681
  source: github-pages

origin/main: 52c4656178c738baaa130dbf0d5b0b46d4cf2542
```

**Audit runtime:** live curl + `gh` + local git/worktree smoke tests on 2026-08-07 (~03:23–03:30Z UTC). Session wall-clock for this agent block: unavailable as a single timer; evidence timestamps above.
