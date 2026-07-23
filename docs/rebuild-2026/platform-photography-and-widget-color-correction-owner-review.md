# Platform photography + widget color correction — owner review

**Date:** 2026-07-23  
**Supersedes:** `docs/rebuild-2026/platform-photography-and-visual-regression-owner-review.md` (**NOT APPROVED**)  
**Constraints:** No commit · no push · no deploy · no Home layout/geometry redesign · no invented photography or photographer names.

**Evidence folder:** `docs/rebuild-2026/platform-color-correction/`  
**Local production inspected:** static tree served at `http://127.0.0.1:8765` (repo root = Pages artifact shape). CDP captures + DOM/`img` src inspection recorded in `capture-meta.json`.

---

## Why the previous review failed

1. **Photography claim was false for owner intent.** The prior agent rewired manifests to `assets/images/home/hero.jpg` / seasons JPGs / Scenes `hero.jpg` — all **identical Unsplash mist-valley bytes** (MD5 `717cfdc…`). That replaced SVG placeholders with a stock stand-in, not field photography. Credits still said “Waypoint Studio.” Owner-visible outcome still felt like “temporary / replace with owner photography” theater.
2. **Category color claim was false at viewing distance.** Prior CSS used a 3px top border + ~22% outer glow — readable only when zoomed. Screenshots did not show distinct blue / amber / green / violet / pink / teal at a glance.
3. **Review matched architecture notes, not the visible product.** Manifest tokens and intended tokens were treated as completion.

---

## Photography recovery findings

| Finding | Detail |
|---------|--------|
| SVG regression | `b264a13` introduced identity SVG placeholders + “Placeholder · replace with owner … photography” credits |
| Unsplash stand-in still on disk | `hero.jpg` + all `seasons/*.jpg` + Scenes `mist-valley.jpg` share MD5 `717cfdc…` (documented Unsplash landscape in Images README) |
| Real field JPGs never deleted | Present under `apps/waypoint-scenes/assets/` since monorepo era |
| Git LFS | Not used for these assets |
| `assets/images/identity/owner/` | Never committed |
| Anthony Mucarri | **Zero** matches in working tree, `git grep` history, or EXIF Artist/Copyright/By-line |

### Recovered field inventory (used this correction)

| Restored web path | Bytes (approx) | Source original | Source commit lineage | Appears on | Caption | Credit |
|-------------------|----------------|-----------------|----------------------|------------|---------|--------|
| `assets/images/featured/bog-bridge-evergreens.jpg` | ~593 KB | `apps/waypoint-scenes/assets/Images/image0.jpeg` | Present since monorepo (`6deaa3c` era); EXIF iPhone XR 2020-05-14 | Home Featured Photography | Bog bridges lead through moss, roots, and standing timber. | Field capture · iPhone XR |
| `assets/images/scenes/old-growth-cedar.jpg` (+ `apps/scenes/assets/media/hero.jpg` copy) | ~584 KB | `apps/waypoint-scenes/assets/Images/Edited-8190413.JPG` | Same era; EXIF Olympus E-M10 | Scenes landing hero | A boardwalk path under filtered canopy light. | Boardwalk Under Canopy · Field capture · Olympus E-M10 |
| `assets/images/featured/fog-forest.jpg` | ~312 KB | `apps/waypoint-scenes/assets/fogforest.jpg` | Panasonic DMC-LX7 EXIF | Sheds / volunteer identity slots | Fog settling through firs and ferns. | Field capture · Panasonic DMC-LX7 |

**Honesty note:** Legacy `photography-data.js` / Images README titled `image0.jpeg` “Elk at Dawn” and `Edited-8190413.JPG` “Old Growth Cedar.” Pixel inspection does **not** support those titles (both are forest boardwalk frames). Captions now describe the actual images. Do not restore the mismatched titles.

### Anthony Mucarri attribution

**Blocked.** No repo artifact, commit, HTML credit, or EXIF field maps any file to Anthony Mucarri. Credits use camera/field-capture language only. Owner must supply photo↔credit mapping if Mucarri should appear.

Screenshot `06-featured-attribution-caption.png` shows field-capture credit (no Mucarri) — this is intentional honesty, not omission of a recoverable name.

---

## Placeholder text removed (Featured / Scenes)

| Surface | Before | After |
|---------|--------|-------|
| Featured Photography image | SVG / Unsplash mist-valley | Field JPG `bog-bridge-evergreens.jpg` |
| Featured lede | “Owner photography when available — never stock theater.” | “Frames from the field — captioned and credited.” |
| Featured caption | Placeholder / Waypoint Studio on Unsplash | Honest title + caption + iPhone XR credit |
| Scenes hero | SVG craft / Unsplash mist-valley | Field JPG boardwalk (`old-growth-cedar.jpg` / media `hero.jpg`) |
| Scenes credit | Placeholder · replace with owner photography | Boardwalk Under Canopy · Field capture · Olympus E-M10 |
| DOM `data-placeholder` | true on identity slots | absent on Featured + Scenes |
| Body copy hits for “temporary placeholder” / “replace with owner photography” | present previously | **none** on Home + Scenes (CDP) |

**Still honest placeholders elsewhere (not claimed complete):** spring/winter seasons (`*.PLACEHOLDER.txt` + `placeholder: true`); Unsplash mist-valley files remain on disk but are **not** wired to Featured / Scenes hero.

---

## Widget category tokens + CSS treatment

Central semantic tokens in `design-system/css/wds-dashboard-rebuild.css` (`.wdb-r`):

| Token | Color | Widget `data-category` |
|-------|-------|------------------------|
| `--category-weather` | sky blue `#4da3e0` | `conditions` |
| `--category-light` | amber-gold `#e8a838` | `light` |
| `--category-nature` | lime `#8fd14a` | `air`, `wildlife`, `nature` |
| `--category-astronomy` | violet `#a78bfa` | `astronomy` |
| `--category-photography` | aurora pink `#e879c8` | `photography` |
| `--category-water` | teal `#2dd4bf` | `rivers`, `water` |
| `--category-hiking` | forest green `#3d8f5a` | `trails`, `hiking` (future-ready) |
| `--category-earth` | rust/orange `#d97757` | `flora`, `mushrooms`, `earth` (future-ready) |
| `--category-alerts` | muted slate `#8b9bb0` | `alerts` (idle) |
| `--category-alerts-active` | red `#ef5350` | `alerts` + `data-alert-active="true"` only |

**Applied treatment (per categorized widget):** 2px colored outline · 36–72px soft outer glow · faint category-tinted background gradient · restrained inner edge glow · matching category label color · matching trust-chip accent. Cards stay dark (not solid colored blocks). `prefers-reduced-motion` reduces glow radius. Layout/spacing/typography/Home hierarchy unchanged.

Default Home still shows Conditions / Light / Air / Astronomy / Alerts. Capture `02-desktop-widget-grid-closeup.png` enables Photography + Rivers + Wildlife via local prefs **for color proof only** (registry defaults unchanged).

---

## Files changed

| File | Why |
|------|-----|
| `assets/images/identity/manifest.json` | Point Featured/Scenes/Sheds at field JPGs; honest captions; `placeholder: false` |
| `assets/images/featured/bog-bridge-evergreens.jpg` | Web-optimized from `image0.jpeg` |
| `assets/images/featured/fog-forest.jpg` | Web-optimized from `fogforest.jpg` |
| `assets/images/featured/README.md` | Inventory + naming honesty |
| `assets/images/scenes/old-growth-cedar.jpg` | Web-optimized from Olympus JPG |
| `apps/scenes/assets/media/hero.jpg` | Replaced Unsplash stand-in with cedar field frame |
| `apps/scenes/index.html` | Honest alt text for hero |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-deepeners.js` | Rich caption; remove placeholder lede |
| `design-system/css/wds-dashboard-rebuild.css` | Semantic `--category-*` + luminous presence |
| `automation/capture-platform-color-correction.mjs` | Local CDP evidence capture |
| `docs/rebuild-2026/platform-color-correction/*` | Screenshots + meta |
| `docs/rebuild-2026/platform-photography-and-visual-regression-owner-review.md` | Marked **SUPERSEDED** |
| This document | Correction owner review |

**Not committed. Not pushed. Not deployed.**

---

## Screenshot evidence

| # | File | What it proves |
|---|------|----------------|
| 1 | `01-desktop-home-full.png` | Full Home desktop; category colors on default widgets |
| 2 | `02-desktop-widget-grid-closeup.png` | Close-up: blue / amber / lime / violet / pink / teal distinct |
| 3 | `03-home-mobile.png` | Home mobile |
| 3b | `03b-home-tablet.png` | Home tablet |
| 4 | `04-desktop-home-featured-photography.png` | Featured Photography = real forest JPG + honest caption |
| 5 | `05-desktop-scenes-hero.png` | Scenes hero = real boardwalk JPG + Olympus credit |
| 6 | `06-featured-attribution-caption.png` | Attribution visible; Mucarri **not** inventable |
| 7 | `07-side-by-side-previous-vs-corrected.png` | Previous subtle treatment vs corrected luminous colors |
| — | `capture-meta.json` | Live `img` src JPG paths, zero placeholder-copy hits, asset HTTP 200 |

---

## Test results (local production)

| Check | Result |
|-------|--------|
| Featured `img` src | `…/assets/images/featured/bog-bridge-evergreens.jpg` (JPG, loads) |
| Scenes hero `img` src | `…/assets/images/scenes/old-growth-cedar.jpg` (JPG, loads) |
| Placeholder copy on Home/Scenes | **none** |
| `data-placeholder="true"` on Featured/Scenes | **none** |
| Category borders (computed) | Distinct RGB per category (see meta) |
| Desktop / tablet / mobile captures | Captured |
| Broken images | none in inspected sessions |
| Local production inspected | **Yes** — `python3 -m http.server 8765` on repo root |

---

## Unresolved

1. **Anthony Mucarri** — no recoverable mapping (blocker for named credit only).
2. **Seasonal spring/winter** — still honest placeholders (mist stand-ins).
3. **Unsplash mist-valley** files remain in tree for legacy paths; not used on Featured/Scenes hero.
4. **`photography-data.js` titles** still say “Elk at Dawn” / “Old Growth Cedar” for mismatched pixels — legacy gallery debt; not wired to Home Featured this correction.
5. **Alerts red** only when `data-alert-active="true"` (hook ready; no live alert feed wired yet).

---

## Direct confirmation

Local production build (repo root via HTTP) was inspected with Chrome CDP. Featured Photography and Scenes hero load **real field JPGs**, not SVG placeholders. Widget category palette is **obvious in normal screenshots** (blue, amber, lime, violet, pink, teal). Mucarri attribution cannot be restored from repo evidence.

READY FOR OWNER REVIEW
