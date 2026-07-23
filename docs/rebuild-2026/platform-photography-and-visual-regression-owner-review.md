> **SUPERSEDED** by `docs/rebuild-2026/platform-photography-and-widget-color-correction-owner-review.md` (2026-07-23 correction). Do not use this document for owner approval.

# Platform photography + visual regression — owner review

**Date:** 2026-07-23  
**Scope:** Restore production photography placeholders; align Scenes/Sheds/studio pages to Rebuild shared shell; strengthen Home widget category-color presence.  
**Constraints honored:** No redesign of approved Home layout/widget behavior · no stock/generated photography · no Scenes/Sheds feature rebuild · no commit · no push · no deploy.

**Screenshots:** `docs/rebuild-2026/platform-visual-regression/`

---

## Root cause of missing photography

Real JPG assets were **never deleted**. They remain tracked in git and on disk.

**Primary regression commit:** `b264a13` (2026-07-21) — `fix(ux): resolve critical launch blockers part 1`  
Introduced `assets/images/identity/manifest.json` + SVG placeholders (`home-sky.svg`, `scenes-craft.svg`, `sheds-forest.svg`, etc.) and rewired Home seasons + Scenes hero to those SVGs. Credits became “Placeholder · replace with owner … photography.”

**Secondary Home change:** `1251ccb` (2026-07-22) — Home RC1 replaced studio-home hero with Dashboard Rebuild. Featured Photography is a below-fold deepener that reads the same identity manifest — so it inherited the SVG placeholders.

**Not a build/deploy exclusion:** Pages deploy does not strip `assets/images/`. `.gitignore` does not ignore photography.

**Mechanism:** Manifest/HTML rewiring, not binary loss.

---

## All recovered images

| File | Bytes / note | Still in tree |
|------|----------------|---------------|
| `assets/images/home/hero.jpg` | Shared mist-valley landscape (MD5 `717cfdc…`) | Yes |
| `assets/images/hero.jpg` | Same bytes | Yes |
| `assets/images/home/seasons/{spring,summer,autumn,winter}.jpg` | Same landscape bytes; spring/winter historically marked placeholder | Yes |
| `assets/images/home/originals/hero-source.jpg` | Archive copy | Yes |
| `apps/scenes/assets/media/hero.jpg` | Same landscape bytes | Yes |
| `apps/scenes/assets/media/mist-valley.jpg` | Same landscape bytes; still used on some Scenes subpages | Yes |
| `apps/waypoint-scenes/assets/Images/image0.jpeg` | Elk at Dawn (iPhone XR field capture) | Yes — legacy Scenes photography tab |
| `apps/waypoint-scenes/assets/Images/Edited-8190413.JPG` | Old Growth Cedar (Olympus) | Yes — legacy Scenes photography tab |
| `apps/waypoint-scenes/assets/fogforest.jpg` | Fog forest field photo | Yes |
| `apps/waypoint-scenes/assets/wetland.jpg` / `bog.jpg` | Wetland field photos (bog ≈ wetland) | Yes |

No tracked `.jpg` deletions in git history. `assets/images/identity/owner/` was documented but **never committed**.

---

## Image filenames and source commits

| Asset | Introduced / last meaningful UI wiring | Disconnected by |
|-------|----------------------------------------|-----------------|
| Home/seasons JPGs | `4f9dbaf` (2026-07-20) seasons manifest with real paths | `b264a13` → SVG |
| Scenes landing `assets/media/hero.jpg` | Pre-`b264a13` `apps/scenes/index.html` | `b264a13` → `scenes-craft.svg` |
| Scenes feature-panel images | `cdaebde` then **removed by design** in `954428f` | N/A — do not restore panels |
| Field captures (`image0`, cedar) | `6deaa3c` monorepo | Still wired in `photography-data.js` |
| `fogforest.jpg` / wetland | Present since RC3 consolidation era | Never wired to Sheds/Volunteer identity until this correction |

---

## Restoration map (image → location)

| Location | Image | Credit restored | Notes |
|----------|-------|-----------------|-------|
| Home Featured Photography deepener | `assets/images/home/hero.jpg` via identity `experiences.home` | Waypoint Studio | Was `home-sky.svg` |
| Home seasons manifest (if hero JS used) | seasons JPGs as at `b264a13^` | Waypoint Studio / Waypoint Scenes; spring/winter remain honest placeholders | Restored JSON |
| Scenes landing hero | `apps/scenes/assets/media/hero.jpg` | Waypoint Scenes | HTML fallback + identity mount |
| Scenes living-scenes / scene-builder / profile | `mist-valley.jpg` / `hero.jpg` | (unchanged) | Already real JPGs |
| Sheds stage background | `apps/waypoint-scenes/assets/fogforest.jpg` | Waypoint Studio | **Not prior Sheds wiring** — replaces invented SVG with available field photography |
| Volunteer identity (manifest) | `apps/waypoint-scenes/assets/wetland.jpg` | Waypoint Studio | Same honesty note as Sheds |
| Home photography **widget** | — | — | Rebuild widget is text status (“coming soon”), not an image card — **layout unchanged** |
| Scenes feature panels | — | — | Intentionally removed in `954428f`; not restored |

---

## Anthony Mucarri attribution findings

**Status: unresolved blocker for named credit.**

Exhaustive search of working tree + full `git rev-list --all` / `git grep` / pickaxe for `Mucarri`, `Anthony Mucarri`, photographer EXIF artist fields: **zero matches**.

Agent/production notes referenced Mucarri as an observed credit, but **no repo artifact maps any file → Anthony Mucarri**.

Restored credits match last approved manifests only: **Waypoint Studio** / **Waypoint Scenes**. Owner must supply the photo↔credit mapping if Mucarri attribution should appear.

---

## Unresolved missing assets

1. **Anthony Mucarri credit mapping** — no recoverable attribution in git.
2. **`assets/images/identity/owner/` kit** — never existed in repo; dedicated distinct owner sky/forest set not available beyond shared mist-valley + field captures.
3. **Spring/winter seasonal photos** — were already `placeholder: true` (mist stand-ins) before the SVG regression; still marked placeholder honestly.
4. **Distinct Home vs Scenes hero photography** — Home and Scenes heroes are still the **same landscape bytes** (known content issue from prior audits). Restored fidelity to last approved wiring; distinct owner frames remain a content follow-up.
5. **Home photography widget imagery** — not part of Rebuild widget geometry; only Featured Photography deepener shows photos.

---

## Root cause of legacy app styling

Home alone fully adopted the Rebuild instrument stack (navy `#080f1c`, morning-blue accent, Inter, quiet chrome).

Scenes (`apps/scenes/css/scenes-home.css`) overrode the shared shell with RC3 charcoal + **moss/olive `#a8c48a`**, Source Sans 3, cream ink `#f4f1ea` — producing the “retired website” jump when leaving Home.

Sheds hub used a forest-green page wash (`#0c1410` + olive radial) rather than the shared navy field; accents were product-appropriate but the **foundation** diverged.

Shared `wds-app-shell.css` still used **olive `#3d5a40` fallbacks** when product tokens were missing.

Quiet-chrome rules lived only in retired `wds-dashboard-os.css`, which Home Rebuild does not load.

---

## Shared-shell implementation recommendation (applied)

1. **Keep** `wds-tokens.css` + `wds-aurora-bridge.css` as the foundation (navy / off-white / product accents).
2. **Scenes / Sheds CSS:** inherit navy background + Inter; restrict product accents to CTAs/nav current/stage (Scenes: violet / lime / magenta; Sheds: aspen gold / burnt orange / bark / slate). Remove moss/olive as shell accent.
3. **`wds-app-shell.css`:** replace olive fallbacks with morning-blue defaults; host quiet-chrome rules in the live shell stylesheet.
4. **Do not** copy Home Rebuild markup into apps; do not change app workflows.
5. **Defer:** Sheds map HUD (intentionally field-native); legacy `apps/waypoint-scenes/` studio stack.

---

## Files changed / intentionally untouched

### Changed
| File | Why |
|------|-----|
| `assets/images/identity/manifest.json` | Point experiences at real JPGs; clear placeholder flags |
| `assets/images/home/seasons/manifest.json` | Restore pre-`b264a13` seasons wiring |
| `apps/scenes/index.html` | Real hero fallback + Inter font link |
| `apps/scenes/css/scenes-home.css` | Shared navy foundation; Scenes product accents only |
| `apps/shed-hunting/index.html` | Inter font link |
| `apps/shed-hunting/css/sheds-home.css` | Shared navy foundation; Sheds accents; photo veil |
| `design-system/css/wds-app-shell.css` | Olive → Rebuild fallbacks; quiet chrome |
| `design-system/css/wds-platform-integration.css` | Olive accent fallback |
| `design-system/css/wds-dashboard-rebuild.css` | Stronger category presence tokens + glow/tint/pill |
| `automation/capture-platform-visual-regression.mjs` | Local capture for this review |
| `docs/rebuild-2026/platform-visual-regression/*` | Screenshots + meta |
| `docs/rebuild-2026/platform-photography-and-visual-regression-owner-review.md` | This document |

### Intentionally untouched
- Home widget grid geometry, Customize, Kiosk structure, registry category IDs  
- Scenes journey hierarchy / feature-panel layout (`954428f` authority)  
- Sheds map HUD CSS  
- Legacy `apps/waypoint-scenes/` photography gallery (already has field JPGs)  
- No commit / push / deploy  

---

## Home / Scenes / Sheds before → after

| Surface | Before | After |
|---------|--------|-------|
| Home Featured Photography | SVG “temporary placeholder” + placeholder credit | Real `hero.jpg` + “Waypoint Studio” |
| Scenes landing | Moss/olive shell + SVG craft placeholder | Navy shared shell + lime/violet accents + real `hero.jpg` |
| Sheds hub | Forest wash / SVG identity | Navy shared shell + aspen-gold accents + `fogforest.jpg` stage |
| Articles / Contact | Already on `wds.css` navy | Shell fallbacks no longer olive if tokens miss |

### Desktop + mobile screenshots

| Shot | Path |
|------|------|
| Home desktop after | `platform-visual-regression/01-desktop-home-after.png` |
| Home Featured Photography | `platform-visual-regression/02-desktop-home-featured-photography.png` |
| Scenes desktop after | `platform-visual-regression/03-desktop-scenes-after.png` |
| Sheds desktop after | `platform-visual-regression/04-desktop-sheds-after.png` |
| Articles / Contact | `05-desktop-articles.png`, `06-desktop-contact.png` |
| Phone Home / Scenes / Sheds | `07`–`10-phone-*.png` |
| Featured Photography phone | `08-phone-home-featured-photography.png` |

---

## Category color — current / proposed / final

**Treatment:** Stronger 3px category top border · wider softer outer glow · subtle inner perimeter glow · faint category tint in card background gradient · category-colored `__cat` labels. Layout/spacing/typography/card geometry unchanged. Trust chips remain trust-semantic (Live / Estimated / Waiting), not recolored by category (honesty).

| Mapping | Token |
|---------|-------|
| Weather/Conditions | sky blue `#6ea8c9` |
| Light/Sun | amber/gold `#e8b86d` |
| Air / Wildlife / Nature | lime `#9dcf6a` |
| Astronomy | violet `#9b7ed4` |
| Photography/Scenes | magenta `#d46ba8` |
| Rivers/Water | cyan/teal `#4db8c9` |
| Hiking/Forest (`trails`) | forest green `#3d7a52` |
| Mushrooms/Earth (`flora`/`mushrooms`/`earth`) | warm orange/rust `#c46a3a` |

| Comparison | Path |
|------------|------|
| (1) Current (Phase 3 subtle hairline) | `category-01-current-desktop-workspace.png` (+ phone) |
| (2) Proposed stronger | `category-02-proposed-desktop-workspace.png` (= implemented treatment) |
| (3) Final approved | `category-03-final-desktop-workspace.png` (+ phone + widgets closeup) |

---

## Test results

Local production-like preview: `python3 -m http.server 8765` + `node automation/capture-platform-visual-regression.mjs`.

| Check | Result |
|-------|--------|
| `GET /assets/images/home/hero.jpg` | 200 |
| `GET /apps/scenes/assets/media/hero.jpg` | 200 |
| `GET /apps/waypoint-scenes/assets/fogforest.jpg` | 200 |
| `GET /apps/waypoint-scenes/assets/wetland.jpg` | 200 |
| Identity manifest placeholders for home/scenes/sheds | `false` |
| Featured Photography shows real landscape + “Waypoint Studio” | Verified in screenshots |
| Scenes hero shows real landscape (not SVG craft) | Verified |
| Sheds stage shows forest photo (not SVG) | Verified |
| Home layout/geometry unchanged except category presence | Verified visually |
| Scenes/Sheds nav on shared navy + product accents (no olive shell) | Verified |
| Category glow visible on Conditions / Light / Air / Astronomy / Alerts | Verified desktop |

`capture-meta.json` records asset HTTP statuses. Runtime console probe in the capture script did not persist structured `checks` in this run; visual + HTTP verification used instead. No broken-image icons observed in captured surfaces.

---

## Known limitations

1. **Anthony Mucarri** credit cannot be restored from repo evidence.  
2. Home/Scenes heroes remain the same landscape file family (content debt).  
3. Sheds/Volunteer photos are available field assets replacing SVG theater — **not** a reverse of a prior Sheds-specific production photo map (none existed).  
4. Scenes feature image panels intentionally not restored (`954428f`).  
5. Home photography **widget** remains a non-image status card by design.  
6. Sheds map and legacy Scenes app stacks were out of scope for full visual unification.  
7. **Not committed, not pushed, not deployed** — production will still show placeholders until an owner-approved publish.

---

## Verdict

| Workstream | Status |
|------------|--------|
| Photography restore | **5 surfaces rewired to real JPGs** (Home Featured, seasons manifest, Scenes hero, Sheds stage, Volunteer manifest). Mucarri attribution **blocked**. |
| Shared shell | **Done** for Scenes landing + Sheds hub + shell fallbacks; product accents retained. |
| Category color presence | **Done** on Home Rebuild widgets. |
| Owner review + screenshots | This doc + `docs/rebuild-2026/platform-visual-regression/`. |
