# RC3 Release — Waypoint Studio

**Version tag:** `v0.3.0-rc3`  
**Branch promoted:** `recovery/rc3-consolidation` → `main`  
**Production URL:** https://waypointstudio.org/  
**Release date:** 2026-07-21  

---

## Release summary

RC3 consolidates the outdoor companion experience onto the canonical Waypoint Studio platform: human journey IA, immersive home, photography-first Scenes, day’s-hunt Sheds, question-first Volunteer, Articles as context, Waypoint’s Take as companion voice, and launch-readiness fixes for **one entry path**, **outdoor language**, **distinct visual identity slots**, and **honest trust labels**.

This is a **production evaluation release** for real devices — not a claim of finished owner photography or zero known limitations.

---

## Major improvements

1. **Mission & home** — Observe. Discover. Understand.; companion framing; How is today? as lead path  
2. **Unified flagship entries** — Nav, home cards, and clarity redirects share one primary destination per product (Dashboard, Photo Coach, Sheds map, Volunteer Discover)  
3. **Scenes** — Photographer journey; Hidden Landscapes as discovery; unfinished tools demoted  
4. **Sheds / Volunteer** — Day’s hunt and “What good can I do today?” framing  
5. **Articles + Take** — Context layer and companion interpretation pattern  
6. **Identity system** — `assets/images/identity/` manifest + temporary distinct SVG placeholders (owner photos replace later)  
7. **Trust** — Cached/offline/unavailable/estimated labels; cached weather no longer marked Live  
8. **Language** — Explore instead of Applications; outdoor phrasing in chrome  

---

## Known limitations

| Limitation | Severity | Notes |
|------------|----------|-------|
| Temporary SVG / placeholder imagery | High | Owner photography not yet installed in identity slots |
| Mobile primary nav (6 peers) still dense | Medium | Deferred from launch-readiness Part 1 |
| Homepage Incubator list still visible | Medium | Softened footer; body list remains |
| Scenes deep URLs still split (`/scenes/` vs `/photo-coach/`) | Low | Primary entry unified |
| Article category hubs warn on empty busy mounts | Low | Link validator warnings only |
| Preview Create/Share surfaces unfinished | Medium | Demoted to Later; not primary |
| Engine TODO comments in Scenes stub engines | Low | Not user-visible banners |
| Dashboard depends on live providers | Medium | Honest empty/cached states; outages need owner walkthrough |

See also: `docs/OWNER-READINESS-AUDIT.md`, `docs/LAUNCH-READINESS-PART1.md`.

---

## Pre-release verification (this release)

- `node automation/validate-production-assets.mjs` — 0 missing  
- `node automation/validate-production-links.mjs` — 0 broken (6 article-category warnings)  
- `node automation/test-production-repair.mjs` — pass  
- `node automation/test-dashboard-v3.mjs` — pass  
- `node scripts/inject-build-metadata.mjs` — dry-run OK (Pages injects at deploy)  
- Foundation test updated for Explore launcher label  

---

## Deploy path

1. Merge `recovery/rc3-consolidation` → `main` (merge commit, history preserved)  
2. Push `main` → GitHub Actions **Deploy GitHub Pages** (`.github/workflows/pages.yml`)  
3. Workflow: inject build metadata → validate assets/links → exclude `private/` → deploy → `verify-production-deploy.mjs`  

---

## Rollback procedure

**Fast content rollback (preferred if Pages history allows):**

1. Revert the merge commit on `main` with a new revert commit (do not rewrite public history unless emergency):  
   `git checkout main && git pull && git revert -m 1 <merge-commit-sha>`  
2. Push `main` — Pages redeploys prior tree.  

**Tag reference:** previous production tip before this merge was `origin/main` at `f68c5b2` (RC2.5 Sprint 5).  

**Emergency:** GitHub → Settings → Pages / Actions → redeploy a prior successful Pages workflow run if available.

**Do not** force-push `main` unless the owner explicitly authorizes disaster recovery.

---

## Owner testing checklist

See the final release report in chat / below for Desktop, iPhone, iPad, Android, Safari, Chrome, Firefox.

---

## Related docs

- `docs/HUMAN-EXPERIENCE-ARCHITECTURE.md`  
- `docs/EXPERIENCE-FIRST-PRODUCT-ARCHITECTURE.md`  
- `docs/LAUNCH-READINESS-PART1.md`  
- `docs/OWNER-READINESS-AUDIT.md`  
- `docs/RELEASE_PLAYBOOK.md`  
