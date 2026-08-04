# Remember Pillar — Owner Review

**Audience:** Owner / product review  
**Date:** 2026-08-03  
**Branch:** `feature/scenes-remember-pillar-foundation`  
**Base choice:** `origin/main` @ `59c09debbe8d9c7d36acf74607bd4ebfa55359fc`  
**Why this base:** Production tip is the cleanest place for a new pillar foundation. Sprint 1/3 and Learn work remain on their own branches — nothing unfinished was destroyed or force-merged.

**Deployment:** None. Feature branch push only. **Not merged to main.**

---

## What shipped (foundation only)

| Deliverable | Path / note |
|-------------|-------------|
| Remember hub | `/apps/scenes/remember/` — Outdoor Journals |
| Placeholders | Hiking, Wildlife, Mushroom, Year in Nature, Calendars, Books |
| Shared model | `apps/scenes/remember/js/remember-model.js` |
| Print stubs | `apps/scenes/remember/js/remember-print.js` |
| Catalog | `apps/scenes/remember/data/remember-catalog.json` |
| Engine stub | `apps/scenes/js/engines/remember-engine.js` |
| Nav | Scenes “Later” + Scenes feature `remember` in nav config/registry |
| Legacy redirect | `/apps/waypoint-scenes/remember/` → scenes Remember hub |
| Architecture doc | `docs/scenes/REMEMBER-PILLAR-ARCHITECTURE.md` |
| Smoke test | `automation/test-scenes-remember-pillar.mjs` |

---

## Canonical flow (Scenes context)

```
Photo Library → Scene Library / Photo Coach → Hidden Landscapes → Living Scenes
                                      ↓
                               Remember (Outdoor Journals)
                                      ├── Hiking Journals
                                      ├── Wildlife Journals
                                      ├── Mushroom Journals
                                      ├── Year in Nature
                                      ├── Calendars
                                      └── Books
```

Remember is the **keep and print** pillar: lasting private records after craft and looking. It does not replace Photo Coach.

---

## How prior WIP was left

| Item | Status |
|------|--------|
| Scenes architecture reconciliation | Not branched / not committed — parked |
| Learn pillar unified branch | Not created — parked for a later priority |
| Dashboard tile-catalog WIP | Stashed as `wip-dashboard-route-inventory-before-remember-pillar` on `feature/dashboard-functional-tile-catalog` |
| Existing stashes (SVG placeholders, RC4, sprint4) | Untouched |

---

## What came from which branch

| Branch / tip | Contribution to this sprint |
|--------------|-----------------------------|
| `origin/main` `59c09de` | Base; live Scenes hub patterns |
| Sprint 1 `e8258e1` | Conceptual Outdoor Journals REMEMBER stub (referenced, not merged) |
| Portfolio / Learn / Coach-2 branches | **Not** integrated here (correct — out of scope) |

---

## Explicitly not built

- Full journal editing UX
- Finished PDF / print books
- AI copy or auto-layout
- Cloud sync / accounts
- Dashboard tile or widget work

---

## How to verify

```bash
# From repo root
node automation/test-scenes-remember-pillar.mjs

# Manual
# Open /apps/scenes/ → Later → Remember
# Open each placeholder under /apps/scenes/remember/
# Click “Probe print stub” — expect PDF-not-implemented status text
# Confirm /apps/waypoint-scenes/remember/ redirects to scenes Remember
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| Two Scenes entry trees (`apps/scenes` vs `apps/waypoint-scenes`) | Canonical Remember under `apps/scenes/remember/`; alias redirect only |
| Nav-config vs nav-registry drift | Both updated with the same `remember` feature |
| Owners expect full journals | Hub + placeholders state “foundation” / “not available yet” |

---

## Recommended next steps

1. One real editor (Hiking Journals) using `RememberDocument`
2. Link keepers from Photo Library into `photoRefs`
3. Implement PDF behind `exportPdfStub` without changing the public stub contract until ready
4. Separate Learn-pillar unification branch when prioritized
5. Only then consider merge to main after owner walkthrough

---

## Confirmation

- **Pushed:** feature branch only (see tip SHA on commit)  
- **No deployment**  
- **No merge to main**
