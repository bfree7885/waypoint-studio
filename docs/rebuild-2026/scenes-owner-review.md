# Owner review — Scenes restart / current-state audit

**Date:** 2026-07-24  
**Focus:** Scenes only  
**Status:** Stop for owner review — **no merge, no deploy, no redesign begun**

Companion detail: [`scenes-current-state-audit.md`](./scenes-current-state-audit.md)

---

## Repository and branch

| | |
|--|--|
| **Repository** | `/home/bryan/Projects/waypoint-studio` |
| **Branch** | `main` |
| **Starting SHA** | `63fc45748ef9e283e413025c24f73cf476415b39` |
| **Working-tree status** | Pre-existing **staged** identity placeholder SVG edits under `assets/images/identity/placeholders/` (unchanged by this audit). **New untracked:** `docs/rebuild-2026/` (this audit + screenshots). |

---

## Commands run

```bash
cd /home/bryan/Projects/waypoint-studio
git rev-parse HEAD && git status -sb && git log -5 --oneline

python3 -m http.server 8080   # local inspection

# Scenes-specific automated suites
node automation/test-photo-coach-shoot-review.mjs
node automation/test-photographer-profile.mjs
node automation/test-personalized-coaching.mjs
node automation/test-hidden-landscapes.mjs
node automation/test-photo-library.mjs
node automation/validate-production-assets.mjs

# Route probes via curl; desktop/mobile screenshots via headless Chrome
# Browser inspection: http://127.0.0.1:8080/apps/scenes/ and /apps/photo-coach/
```

**Not applicable / not present:** root `npm install`, ESLint, TypeScript typecheck, webpack/vite production bundle for Scenes (static site).

**Not run in full:** entire CI job (`smoke-browser.mjs` + `mobile-layout.mjs` + all platform tests). Scenes smoke paths exist in CI and were covered by targeted suites + live inspection instead.

---

## Test / build results

| Gate | Result |
|------|--------|
| Photo Coach Shoot Review | **PASS** (41) |
| Photographer Profile | **PASS** |
| Personalized coaching | **PASS** |
| Hidden Landscapes | **PASS** (134) |
| Photo Library | **PASS** (26) |
| Production asset validation | **PASS** (0 missing) |
| Lint / typecheck | **N/A** (no Scenes TS/ESLint toolchain) |
| Production build | **N/A** — static; serve from repo root |
| Live routes | All major Scenes URLs **200**; `/photo-coach/` root **404** |

---

## Route inventory (summary)

**Live tools:** `/apps/photo-coach/`, `/apps/photo-coach/profile/`, `/apps/photo-library/`, `/apps/hidden-landscapes/`, `/apps/waypoint-scenes/`, `/apps/animal-vision/`  

**Shell / previews:** `/apps/scenes/`, `/apps/scenes/living-scenes/`, `/apps/scenes/scene-builder/`, `/apps/scenes/photographer-profile/`  

**Redirects:** `/scenes/` → Photo Coach; `/apps/scenes/photo-coach|hidden-landscapes|photo-library/` → live tools  

**Nav quirk:** Global **Scenes** link targets **Photo Coach**, not `/apps/scenes/`.

Full table: audit §3.

---

## Current feature inventory (summary)

| Area | State |
|------|--------|
| Photo Coach + Shoot Review | Strongest Scenes capability; local analysis; multi-photo queue/grouping/labels |
| Photographer Profile | Live companion from session history |
| Photo Library | IndexedDB originals + collections |
| Hidden Landscapes | Experimental creative/spectral studio |
| Living Scenes | Preview page + separate early studio in `waypoint-scenes` |
| Dual Coach host | `/apps/waypoint-scenes/` still embeds full Coach mode (Grade stepper) |
| Portfolio Assistant / Auto Portfolio Builder / Outdoor Journals | **Missing** as products |
| Photo pipeline (owner) | `photo_pipeline/` + `apps/photo-pipeline/` — adjacent tooling, not a pillar |

---

## Major technical risks

1. **Fragmented codebase** — UI in `photo-coach/`, logic in `waypoint-scenes/js/`, shell in `scenes/`, library & HL separate. Easy to diverge.  
2. **Dual Photo Coach hosts** — canonical `/apps/photo-coach/` plus Coach mode embedded in `/apps/waypoint-scenes/`.  
3. **Multiple persistence schemas** — Coach sessions, shoots, records, library IndexedDB — migration debt (`docs/STORAGE-INVENTORY.md`).  
4. **Demo analysis ≠ vision AI** — Product may over-promise “coaching” relative to heuristic canvas analysis.  
5. **Importer bridge incomplete** — `receiveSession` stub; Importer handoff not production-complete.  
6. **No type safety / bundler** — Large vanilla JS surface; regressions caught mainly by custom Node tests.  
7. **Dual Living Scenes implementations** — Preview vs `waypoint-scenes` studio confuse ownership.  
8. **Owner photo_pipeline** — separate SQLite/scoring path; must stay distinct from consumer LEARN voice.

---

## Major UX risks

1. **Grades /100 scores** on Photo Coach (preview + engine) conflict with LEARN principles (no homework/grades/judgment).  
2. **Two Scenes “homes”** (global nav → Coach vs `/apps/scenes/` journey).  
3. **Two Photo Coach hosts** — `/apps/photo-coach/` and Coach mode on `/apps/waypoint-scenes/` (still shows **Upload / Grade / Improve / Bring it to Life**).  
4. **Placeholder / empty hero media** on Scenes landing undermines premium photographic feel.  
5. **Redundant journey steps** and soft “Later” links that feel unfinished.  
6. **Reject** labeling, `fieldAssignment` / assignment completion paths, and score-forward hierarchy can feel like homework despite privacy disclaimers.  
7. **Mobile nav wrap** is dense vs calm outdoor brand.

---

## Legacy code — retain / rewrite / remove

| Retain | Rewrite (careful) | Remove or demote (later) |
|--------|-------------------|---------------------------|
| Shoot Review, queue, grouping, EXIF, upload utils | Grade → observational reading UX | Grade-first meta copy; homework/lesson/assignment framing |
| Hidden Landscapes honesty + transforms | Single Living Scenes entry | Treating `scenes` and `waypoint-scenes` as equal flagships forever |
| Photo Library store model | Nav + `/scenes/` redirect once IA chosen | Premature deletion of engine stubs |
| Soft-language profile patterns | experiences.json → six pillars | — |

**Do not** wholesale rewrite Photo Coach or overwrite it with incomplete Scenes 3.0 WIP.

---

## Recommended Scenes architecture

One product **Scenes** with six pillars under `apps/scenes/` IA:

1. **LEARN** — Photo Coach (no grades)  
2. **SELECT** — Portfolio Assistant (evolve Shoot Review)  
3. **BUILD** — Auto Portfolio Builder (new)  
4. **REMEMBER** — Outdoor Journals (new)  
5. **CREATE** — Living Scenes (merge `waypoint-scenes` studio)  
6. **EXPLORE** — Hidden Landscapes (+ Animal Vision family)  

Shared local catalog: Photo Library. Local-first; explain recommendations; never auto-delete; preserve originals.

---

## Recommended ordered sprint plan

1. LEARN integrity + single Scenes door (language + IA)  
2. SELECT — Portfolio Assistant from Shoot Review  
3. CREATE consolidation (Living Scenes)  
4. EXPLORE naming/polish  
5. BUILD v0 portfolios  
6. REMEMBER v0 journals  
7. Persistence unification  
8. Importer handoff (when ready)

---

## Screenshots / capture paths

Under `docs/rebuild-2026/screenshots/`:

- `desktop-scenes-landing.png` / `mobile-scenes-landing.png`  
- `desktop-photo-coach.png` / `mobile-photo-coach.png`  
- `desktop-waypoint-scenes.png`, `desktop-hidden-landscapes.png`, `desktop-photo-library.png`  
- `desktop-living-scenes.png`, `desktop-photographer-profile.png`  

---

## Explicit recommendation — first implementation sprint

**Sprint 1: “Scenes LEARN integrity + single door”**

1. Owner chooses **one** primary entry: journey home (`/apps/scenes/`) **or** Coach-first — then align global nav + `/scenes/` redirect.  
2. Remove letter grades and `/100` from default Photo Coach UI; keep coaching narrative (strengths / worth noticing / optional curiosity).  
3. Fix grade language in meta, `/apps/waypoint-scenes/` Coach stepper, and assignment-named APIs/copy.  
4. Declare `/apps/photo-coach/` the sole consumer Coach SoT (demote or redirect Coach mode on `waypoint-scenes`).  
5. Dedupe and reorder the Scenes journey list; address placeholder hero photography.

**Rationale:** Protects brand trust for the flagship LEARN pillar and clarifies IA before investing in SELECT / BUILD / REMEMBER. Builds on the strongest existing code rather than a rewrite.

Exploration detail that informed this addendum: [Explore Scenes codebase](cb41d0bf-9515-4d02-997d-30c53010fb25).

---

## Verdict

Scenes already has a serious **Photo Coach + Shoot Review + Library + Hidden Landscapes** foundation on a static, local-first stack — but the **six-pillar product vision is not yet the information architecture**, and **grading language remains a first-class UX contradiction**.

**Stop for owner review. No merge. No deploy. No broad redesign started.**
