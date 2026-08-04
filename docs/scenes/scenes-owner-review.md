# Scenes — Owner Review (Reconciliation)

**Date:** 2026-08-03  
**Audience:** Owner  
**Status:** Analysis complete — **stop for review. No merge. No deploy.**  
**Detail:** [`scenes-reconciliation-report.md`](./scenes-reconciliation-report.md)  
**Docs branch:** `docs/scenes-reconciliation-2026-08-03` from `origin/main` @ `59c09de`

---

## In one paragraph

Scenes on the live site is a solid craft toolkit (review shoots, keep photographs, experiment with Hidden Landscapes), but the unfinished “whole product” work is split across branches that disagree about the front door. This reconciliation picks **one journey** and **one architecture**, says what exists where, and recommends **what to merge when** — without inventing features or shipping anything.

---

## The journey (canonical)

```text
Importer → Photo Library → Scene Library → Learn → Create → Remember → Explore
```

| Step | What you do | Where it should live |
|------|-------------|----------------------|
| **Importer** | Bring photos in from a card or folder | Desktop Waypoint Importer → hands off to Scenes (contract ready on Sprint 3) |
| **Photo Library** | Keep originals safely on this device | `/apps/photo-library/` — **live today** |
| **Scene Library** | Every shoot becomes a lasting **Scene** | Should be `/apps/scenes/library/` — **built on Sprint 3, not live** |
| **Learn** | Understand what you made (Photo Coach) | `/apps/photo-coach/` — **live today** (smarter review architecture waiting on Coach 2.0) |
| **Create** | Turn a still into quiet living atmosphere | Living Scenes studio — **preview on live; real studio on Sprint 1/3** |
| **Remember** | Journals, calendars, books you can keep/print | `/apps/scenes/remember/` — **foundation on Remember branch only** |
| **Explore** | Other ways of seeing | `/apps/hidden-landscapes/` — **live (experimental)** |

This is the product spine. Portfolio tools can come later; they are **not** required for the spine.

---

## What exists where (plain language)

### Live production (waypointstudio.org · build `59c09de` = `main`)

- Scenes home at `/apps/scenes/`
- Photo Coach, Photo Library, Hidden Landscapes work
- `/scenes/` shortcut jumps straight to Photo Coach (skips the home)
- **No** Scene Library, **no** Outdoor Journals, **no** finished Living Scenes product
- Old combined studio at `/apps/waypoint-scenes/` still reachable

### Waiting on branches (not live)

| Branch | What you get if merged carefully |
|--------|----------------------------------|
| **Turnaround Sprint 5** | Honest home page: only advertise what’s real; quiet the unfinished bits |
| **Sprint 1** | One Photo Coach (no duplicate coach), calmer language (less “grade/homework”), clearer Create path |
| **Sprint 3** | **Scene Library** — the missing middle of the journey |
| **Remember foundation** | Outdoor Journals hub + placeholders + print stubs under `/apps/scenes/remember/` |
| **Photo Coach 2.0** | Better education-style review structure (not wired into the live coach UI yet) |
| **Sprint 4 (stash only)** | Coach opens a Scene without re-uploading |
| **RC4** | Shared look-and-feel chrome across Studio (not Scenes features) |
| **Portfolio branches** | Assistants / builders for selecting and shaping portfolios — after Scene Library |

**Learn note:** A dedicated “Learn pillar unification” branch was never created. Sprint 2 under the expected name does not exist. Learn progress today = live Photo Coach + Sprint 1 language work + Coach 2.0 architecture + unfinished Sprint 4 stash.

---

## The big conflict (please decide once)

Two different “front doors” were built:

1. **Production / Turnaround / Remember** → home is `/apps/scenes/`
2. **Sprint 1 / Sprint 3** → home becomes `/apps/waypoint-scenes/`

**Recommendation:** Keep **`/apps/scenes/`** as the door people see. Use `waypoint-scenes` as the engine room (Coach code, Scene Library implementation, Living Scenes studio) — not as the public home.

If Sprint 1 is merged without that adjustment, the live nav flips and Remember’s placement fights Scene Library’s placement.

---

## What to merge when (short)

1. **Docs** (this) — shared map  
2. **Turnaround Scenes honesty** (real commits only — ignore publish noise on that branch tip)  
3. **Sprint 1** — but keep `/apps/scenes/` as the door  
4. **Sprint 3 Scene Library** — unlocks the journey’s center  
5. **Remember** — rebase onto Scene Library so journals attach to Scenes  
6. **Photo Coach 2.0** — Learn architecture  
7. **Sprint 4 scene-native Coach** — recover from stash first  
8. **RC4 chrome** — carefully, without fighting Dashboard work  
9. **Portfolio suite** — only after Scene Library is real  

**Do not** merge the noisy tip of `turnaround/sprint-05-scenes-surface-cleanup` as-is (hundreds of engine-publish commits).  
**Do not** deploy from any of these until the door conflict is resolved in the integration branch.

---

## Navigation cleanup (recommendation only)

Today you effectively have more than one “Scenes home.” Fix by policy:

- Global **Scenes** → `/apps/scenes/`
- Shortcut `/scenes/` → `/apps/scenes/` (not Photo Coach)
- One local menu: Library · Scene Library · Learn · Create · Remember · Explore
- Label `/apps/waypoint-scenes/` as legacy/studio — not the product home

No nav code was changed in this docs-only sprint.

---

## Risks you should care about

1. **Merging Sprint 1/3 without fixing the door** — users land in the wrong home.  
2. **Merging Remember and Sprint 3 as strangers** — two journal homes, Scene-unaware journals.  
3. **Branches are months of main behind (Sprint 1/3)** — expect careful rebase, not a casual merge button.  
4. **Sprint 4 only lives in a stash** — easy to lose; promote to a branch soon.  
5. **Promising Create / Journals / Portfolio on the live home before they ship** — trust problem (Turnaround already fixes this on its branch).

---

## What this sprint did / did not do

| Did | Did not |
|-----|---------|
| Reviewed the named Scenes branches + production stamp | Invent new features |
| Wrote reconciliation + this owner summary | Merge anything to `main` |
| Recommended one architecture + one journey | Deploy to production |
| Left Dashboard / platform WIP alone | Rewrite application code |
| Preserved stashes / parallel agent work | “Fix” nav in code on this branch |

---

## Ask of the owner

1. Confirm the journey: **Importer → Photo Library → Scene Library → Learn → Create → Remember → Explore**.  
2. Confirm the door: **`/apps/scenes/`** stays canonical.  
3. Approve the merge order above (or adjust priority between Remember vs Coach 2.0 after Scene Library).  
4. When ready, authorize an **integration branch** (not this docs branch) to rebase Sprint 1/3 with the door rule — still no deploy until you say so.
