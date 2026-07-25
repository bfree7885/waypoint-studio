# Scenes — Current-State Audit (2026 restart)

**Date:** 2026-07-24  
**Machine:** Meerkat / Pop!_OS  
**Scope:** Scenes only (Photo Coach, Living Scenes / Scene Builder, Hidden Landscapes, Photo Library, Scenes shell). Dashboard / Sheds / Waypoint Importer out of scope except inbound nav links.  
**Repo:** `/home/bryan/Projects/waypoint-studio`  
**Branch:** `main`  
**Starting SHA:** `63fc45748ef9e283e413025c24f73cf476415b39`  
**Working tree at audit start:** staged placeholder SVG identity assets only (pre-existing; not part of this audit).  

**No redesign or feature implementation was performed.** Local static server used for inspection only. Screenshots written under `docs/rebuild-2026/screenshots/`.

---

## 1. Repository identity

| Item | Value |
|------|--------|
| Path | `/home/bryan/Projects/waypoint-studio` |
| Branch | `main` (tracks `origin/main`) |
| SHA | `63fc457` — *Merge branch 'recovery/rc3-consolidation' — RC3 production release* |
| Framework | **Static multi-page site** (HTML + vanilla JS + CSS). No React/Next root app. No root `package.json`. |
| Build tooling | None for Scenes runtime. Serve with `python3 -m http.server 8080` from repo root. |
| Design system | `design-system/` (WDS app shell, nav, tokens) |
| CI | `.github/workflows/ci.yml` — Node 20 scripts under `automation/` + headless Chrome smoke |
| Lint / typecheck | **No ESLint / TypeScript project for Scenes.** Quality gates are Node smoke + domain test scripts. |
| Production build | **N/A** — GitHub Pages static publish (`.github/workflows/pages.yml`). “Build” = validate assets + serve. |

Related but separate checkout: `waypoint-studio-site` exists under `~/Projects/` — **canonical product code audited here is `waypoint-studio`.**

---

## 2. Scenes surface map (what exists where)

Scenes is **not one app folder**. It is a **product constellation**:

| Surface | Path | Role today |
|---------|------|------------|
| Scenes journey landing | `apps/scenes/` | Marketing / day-with-camera shell; engines are **interfaces only** |
| Clarity redirect | `/scenes/` | Redirects to **`/apps/photo-coach/`** (not the journey landing) |
| Photo Coach (live) | `apps/photo-coach/` | Shoot Review UI; loads ~20 scripts from `apps/waypoint-scenes/js/` |
| Photo Coach logic | `apps/waypoint-scenes/js/photo-coach*.js` | Analysis, EXIF, queue, grouping, profile, portfolio sessions, importer bridge |
| Living Scenes / Scene Builder studio | `apps/waypoint-scenes/` | Early Living Scene + Parallax + Collections + Export; **also hosts a full Photo Coach mode** (duplicate surface) |
| Hidden Landscapes | `apps/hidden-landscapes/` | Experimental spectral / creative vision studio |
| Animal Vision | `apps/animal-vision/` | Related Explore track (linked from HL / Scenes ecosystem) |
| Photo Library | `apps/photo-library/` | Local IndexedDB catalog + collections |
| Photo Pipeline (owner tooling) | `apps/photo-pipeline/` + `photo_pipeline/` | Desktop/CLI media path (SQLite, scores, review UI) — adjacent to Scenes, not a six-pillar product |
| Module landings / redirects | `apps/scenes/<module>/` | Some are preview pages; Photo Coach / HL / Library are **redirects** to live tools |

Architecture self-description: `apps/scenes/docs/ARCHITECTURE.md` (five experiences).  
**Owner six-pillar vision (LEARN / SELECT / BUILD / REMEMBER / CREATE / EXPLORE) is only partially mapped** — see §7.

---

## 3. Route inventory

All probed routes returned **HTTP 200** unless noted. Server: `python3 -m http.server 8080`.

### Primary / clarity

| Route | Status | Notes |
|-------|--------|-------|
| `/apps/scenes/` | 200 | Journey landing — “Review today’s shoot” |
| `/scenes/` | 200 | Meta-refresh → `/apps/photo-coach/` |
| `/photo-coach/` | **404** | No root alias |

### Scenes module routes

| Route | Status | Notes |
|-------|--------|-------|
| `/apps/scenes/photo-coach/` | 200 | Redirect → `/apps/photo-coach/` |
| `/apps/scenes/hidden-landscapes/` | 200 | Redirect → `/apps/hidden-landscapes/` |
| `/apps/scenes/photo-library/` | 200 | Redirect → `/apps/photo-library/` |
| `/apps/scenes/living-scenes/` | 200 | **Preview only** — no controls |
| `/apps/scenes/scene-builder/` | 200 | Preview → points at `waypoint-scenes` |
| `/apps/scenes/photographer-profile/` | 200 | Preview → `/apps/photo-coach/profile/` |

### Live tools

| Route | Status | Notes |
|-------|--------|-------|
| `/apps/photo-coach/` | 200 | Shoot Review / upload |
| `/apps/photo-coach/profile/` | 200 | Photographer companion |
| `/apps/photo-coach/guide/` | 200 | “My Photography Journey” |
| `/apps/waypoint-scenes/` | 200 | Living Scene studio **and** alternate Photo Coach host (`data-product-mode=coach\|builder`) |
| `/apps/hidden-landscapes/` | 200 | Studio |
| `/apps/hidden-landscapes/gallery.html` | 200 | Gallery |
| `/apps/hidden-landscapes/learn.html` | 200 | Context / learn |
| `/apps/photo-library/` | 200 | Library |
| `/apps/animal-vision/` | 200 | Animal vision explorer |

### Navigation entry points into Scenes

| Source | Target |
|--------|--------|
| Global nav **Scenes** | `apps/photo-coach/` (hint: “Review today’s shoot”) — **skips** `apps/scenes/` landing |
| Product registry `route` for Scenes | `apps/scenes/` (used for matching / discover) |
| Scenes local nav | Today → `apps/scenes/`; Review a shoot → Photo Coach; Your photographs → Library; Other ways of seeing → Hidden Landscapes |
| Home / support / articles | Links to `apps/scenes/` and/or Photo Coach |
| `studio-home.js` | Links to `apps/scenes/` |

**Inconsistency:** Global primary CTA for Scenes opens Photo Coach; product docs and `apps/scenes/` describe a broader journey home.

---

## 4. Feature inventory vs six pillars

### LEARN — Photo Coach

**Present (substantial):**

- Single-image and multi-image (1–20) upload: drop, browse, paste, folder picker  
- Client-side “demo” analysis (canvas sampling + heuristics) — not a cloud vision model  
- Critique UI: strengths, improvements, category breakdown, edit suggestions, outdoor context hook  
- Shoot Review: queue, grouping (burst / near-duplicate), Keep/Maybe/Reject/Favorite, Shoot Summary  
- Session history (localStorage), compare, profile companion, skills / personalized coaching layers  
- Importer bridge stub (`WaypointPhotoCoachImporterBridge`) — protocol validate/stage only  

**Conflicts with stated LEARN principles:**

- Letter grades + `/100` scores are first-class (preview shows **B+ 84/100**; CSS class names `coach-grade-*`)  
- Meta description still says “grade, strengths, and improvement coaching”  
- Legacy build report language: “Upload → Grade → Improve”, “lesson”, “practice”, “next field challenge” / assignment tone  
- `Reject` label is private (good) but naming can read as judgmental vs “set aside”  

### SELECT — Portfolio Assistant

**Partial only:**

- Shoot Review private labels + best-of categories + similar-frame grouping ≈ early SELECT  
- No product named “Portfolio Assistant”  
- No dedicated “recommend strongest frame with explanation-only UI” free of scores  

### BUILD — Auto Portfolio Builder

**Mostly absent:**

- `photo-coach-portfolio.js` is a **local session/thumbnail store**, not balanced portfolio construction  
- No website / print book / calendar / gallery builders  

### REMEMBER — Outdoor Journals

**Absent as a Scenes product:**

- No hiking / wildlife / mushroom / Year-in-Nature / photography book / calendar journal builders under Scenes  
- Unrelated “journal” links exist in ForageCast / Steepleaf nav — not Scenes REMEMBER  

### CREATE — Living Scenes

**Split / unfinished:**

- `apps/scenes/living-scenes/` — honest preview (“no animation controls yet”)  
- `apps/waypoint-scenes/` — earlier Living Scene + Parallax effects studio (upload, presets, export PNG)  
- `AnimationEngine` in `apps/scenes/js/engines/` — interface only  

### EXPLORE — Hidden Landscapes

**Present (experimental):**

- Local canvas transforms (IR-inspired, false color, mono studies, etc.) with honesty labeling  
- Gallery + learn pages; Animal Vision sibling app  
- Strong automated test coverage (`automation/test-hidden-landscapes.mjs`)  

---

## 5. Technical inventory

### APIs / backend

- **No Scenes server API.** All analysis and storage is browser-local.  
- Optional outdoor context may read Dashboard location state when present (client-side).  

### Services / engines

| Module | Location | Status |
|--------|----------|--------|
| Photo Coach core | `apps/waypoint-scenes/js/photo-coach.js` (+ many `photo-coach-*.js`) | Live |
| Shoot / queue / grouping | `photo-coach-shoot.js`, `queue.js`, `grouping.js` | Live |
| EXIF | `exif-reader.js` | Live (minimal JPEG EXIF) |
| File upload utils | `utils/file-upload.js` | Live |
| Photo Library | `apps/photo-library/js/pl-*.js` | Live |
| Hidden Landscapes | `apps/hidden-landscapes/js/hl-*.js` | Live |
| Scenes engines | `apps/scenes/js/engines/*` | Interface stubs / thin bridges |
| Living Scene runtime | `apps/waypoint-scenes/js/engine/*`, `parallax.js`, `effects.js` | Early studio |

### Persistence

| Key / store | Purpose |
|-------------|---------|
| `waypoint-photo-coach-sessions-v1` | Single-frame session history + thumbs |
| `waypoint-photo-coach-shoots-v1` | Shoot Review sessions (max 12) |
| `waypoint-photo-records-v1` / shoots entity keys | Growth / profile ingest |
| Profile growth keys | Photographer Profile companion |
| `waypoint-photo-library-index-v1` (+ collections/meta) | Library metadata |
| IndexedDB `waypoint-photo-library-media-v1` | Original blobs |
| `sessionStorage` importer handoff | Importer bridge staging |

### Upload & image processing

- Client-only File / drag-drop / paste / directory  
- Size/type gates (JPG/PNG/WebP, ~20 MB)  
- Canvas-based demo analysis + HL transforms  
- Thumbnails via canvas `toDataURL`  
- No server-side processing pipeline in this repo for Scenes  

### EXIF

- Custom minimal reader (`exif-reader.js`): camera, lens, exposure, focal length, time, GPS, orientation, dimensions  
- Used to enrich coaching + shoot stats; profile code avoids fabricating missing location/season  

### Multi-photo / Shoot Review

- Documented in `apps/photo-coach/docs/SHOOT-REVIEW.md`  
- Covered by `automation/test-photo-coach-shoot-review.mjs` (41 assertions — **pass**)  

### Tests (Scenes-related, run in this audit)

| Command | Result |
|---------|--------|
| `node automation/test-photo-coach-shoot-review.mjs` | **PASS** (41) |
| `node automation/test-photographer-profile.mjs` | **PASS** |
| `node automation/test-personalized-coaching.mjs` | **PASS** |
| `node automation/test-hidden-landscapes.mjs` | **PASS** (134) |
| `node automation/test-photo-library.mjs` | **PASS** (26) |
| `node automation/validate-production-assets.mjs` | **PASS** (0 missing refs) |

**Not run (heavy / full CI):** full `smoke-browser.mjs`, `mobile-layout.mjs`, entire CI matrix. Smoke script **does** include Scenes paths (`automation/smoke-browser.mjs` lines ~35–58).

**Install:** not required for Scenes runtime (no root deps). `audits/live-site-qa/` has its own Playwright package for optional live QA — unused here.

---

## 6. UX / product findings (inspected live)

Screenshots: `docs/rebuild-2026/screenshots/` (`desktop-*` 1440×900, `mobile-*` 390×844).

### Working / coherent

- Photo Coach Shoot Review landing is usable; upload controls present; privacy copy is clear  
- Dark charcoal / aurora-green shell matches premium outdoor direction at a high level  
- Hidden Landscapes and Photo Library pages load; Living Scenes preview is honestly labeled  
- Mobile Scenes landing remains navigable (nav wraps; hero + journey list present)  

### Broken / confusing / unfinished

1. **Dual homes:** Global **Scenes** → Photo Coach; `/apps/scenes/` is a second “home” many users never see.  
2. **`/scenes/` ≠ `/apps/scenes/`** — clarity route jumps straight to Coach.  
3. **Placeholder photography** on Scenes landing (“Placeholder · replace with owner photography”); hero SVG / empty media feel unfinished.  
4. **Identical / reused media** historically noted (`hero.jpg` ≡ `mist-valley.jpg` in prior audits) — visual sameness risk remains.  
5. **Grade UI** on Photo Coach example preview contradicts anti-homework / anti-grade principles.  
6. **Journey list redundancy** on `apps/scenes/`: “Review today’s shoot” appears twice; Import vs Review ordering is muddled.  
7. **Living Scenes split brain:** preview page vs fuller `waypoint-scenes` studio — users may not discover the working studio from the preview.  
8. **Dual Photo Coach hosts:** `/apps/photo-coach/` (canonical) and Coach mode on `/apps/waypoint-scenes/` share JS but the latter still ships **Upload / Grade / Improve / Bring it to Life**.  
9. **Module footer links** on Living Scenes still say “Waypoint Scenes” while product branding is shifting to “Scenes”.  
10. **`/photo-coach/` root 404** — easy bookmark miss.  
11. **Legacy docs** (`PHOTO_COACH_BUILD_REPORT.md`) still sell Grade / lesson / assignment framing.  

### Language risks (samples)

- Meta: “grade, strengths, and improvement coaching” (`apps/photo-coach/index.html`)  
- Preview: letter + `/100` score  
- **Duplicate Coach host** (`apps/waypoint-scenes/index.html`): hero steps **Upload / Grade / Improve / Bring it to Life** — explicit grade framing still shipped  
- Internal: `overallGrade`, `letterGrade`, `computeShootScore`, `fieldAssignment`, `nextShootChallenge`, `completeAssignment` (profile/guide path)  
- Positive counterexamples exist (profile soft language tests; “not a ranking” takeaways; playbook bans) — inconsistent with live UI  
- Persistence inventory (broader than Scenes): `docs/STORAGE-INVENTORY.md`

### Accessibility / visual

- Skip links and app shell present  
- Grade/score visual hierarchy may dominate coaching narrative (UX risk)  
- Mobile global nav becomes a dense multi-row wrap — usable but not calm  

---

## 7. Pillar gap matrix

| Pillar | Vision | Current | Gap severity |
|--------|--------|---------|--------------|
| LEARN | Photo Coach without grades/homework | Strong engine + Shoot Review; **grades remain** | High (tone/product) |
| SELECT | Portfolio Assistant | Labels + grouping only | High |
| BUILD | Auto Portfolio Builder | Session store only | Critical (missing) |
| REMEMBER | Outdoor Journals | Missing | Critical (missing) |
| CREATE | Living Scenes | Preview + early `waypoint-scenes` | Medium |
| EXPLORE | Hidden Landscapes | Experimental studio live | Low–medium (maturity) |

---

## 8. Legacy / duplicate implementations

| Keep | Rewrite carefully | Remove / demote later |
|------|-------------------|------------------------|
| Photo Coach Shoot Review + queue/grouping | Grade → observational “reading” UX | Homework / assignment / lesson framing; `fieldAssignment` / `completeAssignment` naming |
| Hidden Landscapes honesty model + transforms | Unify Living Scenes entry (preview vs studio) | Duplicate Scenes “homes” once IA is decided |
| Photo Library IndexedDB model | Consolidate nav: one Scenes entry story | Coach mode **inside** `waypoint-scenes` once `/apps/photo-coach/` is sole SoT |
| `exif-reader.js`, file-upload utils | — | Root `/scenes/` redirect target if journey home becomes primary |
| `apps/scenes/` as product shell | experiences.json → six-pillar catalog | Treating `waypoint-scenes` and `scenes` as equal products forever |
| `photo_pipeline` (owner publish path) | Keep separate from consumer Scenes UX | Do not conflate pipeline “scores” with LEARN coaching voice |

**Do not rewrite Photo Coach wholesale** — prior RC3 guidance and architecture docs warn against copying incomplete Scenes 3.0 WIP over Coach.

---

## 9. Recommended architecture (target)

```
Scenes (one product)
├── Shell: apps/scenes/          # six-pillar IA, deep links only
├── LEARN:   photo-coach/        # observational coaching (no grades)
├── SELECT:  portfolio-assistant/# evolve Shoot Review labels → explained picks
├── BUILD:   portfolio-builder/  # new — balanced sets for destinations
├── REMEMBER:journals/           # new — outdoor journals / books / calendars
├── CREATE:  living-scenes/      # merge waypoint-scenes studio under this name
└── EXPLORE: hidden-landscapes/ (+ animal-vision as mode family)
Shared: photo-library/ (catalog), design-system/, local-first persistence
```

Principles: local-first; explain every recommendation; never auto-delete; user owns artistic decisions; preserve original photographs in CREATE/EXPLORE.

---

## 10. Recommended ordered sprint plan

1. **IA + language freeze for LEARN** — Single Scenes entry decision; remove grade/score from primary UX; align copy with six pillars.  
2. **SELECT foundation** — Elevate Shoot Review into Portfolio Assistant (explained keepers / weaker frames / near-duplicates; no auto-reject).  
3. **CREATE consolidation** — One Living Scenes path; demote confusing preview-only dead-ends.  
4. **EXPLORE polish** — HL + Animal Vision under Explore pillar naming.  
5. **BUILD v0** — Manual + assisted portfolio sets (website/print targets) from labeled keepers.  
6. **REMEMBER v0** — One journal type (e.g. hiking or Year in Nature) with export.  
7. **Persistence unification** — Library as source of truth; migrate Coach session keys.  
8. **Importer handoff** — Complete bridge when Importer is ready (out of scope for this audit build).  

---

## 11. Explicit recommendation for first implementation sprint

**Sprint 1 — “Scenes LEARN integrity + single door”**

Goals (implementation later; not started here):

1. Decide and implement **one primary Scenes entry** (`/apps/scenes/` journey **or** Coach-first — owner pick) and align global nav + `/scenes/` redirect.  
2. Remove **letter grades and /100 scores from the default Photo Coach UI** (preview + live critique), replacing with observational language already partially present (“overall reading”, strengths, worth noticing). Keep internal numeric signals only if needed for SELECT heuristics — not shown as grades.  
3. Rewrite Photo Coach meta/hero copy that still says “grade”.  
4. Light IA pass on `apps/scenes/` journey list (dedupe Review; order Import → Review → Choose → Learn → Explore).  
5. Replace or clearly frame placeholder identity photography on the Scenes landing.  

**Why first:** Unblocks brand-trust for the flagship pillar before building SELECT/BUILD/REMEMBER. Reuses the strongest existing code (Coach + Shoot Review) instead of a greenfield rewrite.

---

## 12. Out of scope / not done

- No merge, deploy, or broad redesign  
- No Dashboard / Sheds / Importer work  
- Full CI smoke / mobile-layout suite not executed end-to-end (Scenes unit suites + asset validation + live browser inspection done)  

---

## 13. Screenshot index

| File | Screen |
|------|--------|
| `docs/rebuild-2026/screenshots/desktop-scenes-landing.png` | Scenes journey home |
| `docs/rebuild-2026/screenshots/mobile-scenes-landing.png` | Same, mobile |
| `docs/rebuild-2026/screenshots/desktop-photo-coach.png` | Photo Coach Shoot Review |
| `docs/rebuild-2026/screenshots/mobile-photo-coach.png` | Photo Coach mobile |
| `docs/rebuild-2026/screenshots/desktop-waypoint-scenes.png` | Living Scene studio |
| `docs/rebuild-2026/screenshots/desktop-hidden-landscapes.png` | Hidden Landscapes |
| `docs/rebuild-2026/screenshots/desktop-photo-library.png` | Photo Library |
| `docs/rebuild-2026/screenshots/desktop-living-scenes.png` | Living Scenes preview |
| `docs/rebuild-2026/screenshots/desktop-photographer-profile.png` | Photographer Profile |
| `docs/rebuild-2026/screenshots/desktop-scenes-photo-coach-module.png` | Module redirect → Coach |
