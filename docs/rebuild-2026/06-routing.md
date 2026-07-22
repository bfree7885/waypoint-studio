# 06 — Routing

**Status:** Architecture baseline — awaiting owner approval  
**Depends on:** [02-information-architecture.md](./02-information-architecture.md)

---

## Principles

1. **Three primary products** in studio navigation: Dashboard, Scenes, Sheds.
2. **Stable public URLs** — prefer keep existing production paths where they already mean the right product; add redirects rather than breaking bookmarks when renaming.
3. **Start-here over gateway theater** — Launch CTAs land on the real work surface (Dashboard workspace, Scenes craft tool, Sheds map).
4. **Depth-aware relative hrefs** — shared shell resolves routes by document depth (existing WDS nav pattern).
5. **Honesty** — incubator and supporting apps may keep URLs; they are not primary nav peers in the rebuild portfolio.
6. **Greenfield IA, pragmatic paths** — architecture may rename later; this doc sets the contract agents should implement toward.

---

## Canonical product routes (rebuild target)

| Product | Canonical entry | Start-here | Notes |
|---------|-----------------|------------|-------|
| **Dashboard** | `/apps/dashboard/` | Workspace (widgets + Today Outside) | Retire Outdoor OS as the meaning of this route after rebuild ships |
| **Scenes** | `/apps/scenes/` | Hub; start-here tool may be Photo Coach | Working tools may remain at legacy paths with redirects |
| **Sheds** | `/apps/shed-hunting/` or future `/apps/sheds/` | **Map** | Prefer map as start-here; landing optional |

### Scenes tool routes (current → rebuild policy)

| Experience | Preferred public path (today) | Rebuild policy |
|------------|-------------------------------|----------------|
| Scenes hub | `/apps/scenes/` | Keep as product home |
| Photo Coach / Shoot Review | `/apps/photo-coach/` | Keep stable; hub deep-links |
| Photo Library | `/apps/photo-library/` | Keep stable; hub deep-links |
| Hidden Landscapes | `/apps/hidden-landscapes/` | Keep; experimental label |
| Module aliases | `/apps/scenes/<module>/` | Intro pages + redirect to live tools |

### Sheds routes

| Experience | Path | Rebuild policy |
|------------|------|----------------|
| Sheds root | `/apps/shed-hunting/` | Product root / optional landing |
| Map | `/apps/shed-hunting/map/` | **Primary start-here** |
| Legacy alias | `/map/` | Keep redirect to Sheds map |

If the owner later renames `shed-hunting` → `sheds`, do it with permanent redirects.

---

## Studio & shared routes

| Surface | Path | Role |
|---------|------|------|
| Studio Home | `/` | Brand + launch three products |
| Settings / Places | `/settings.html` (or successor) | Shared prefs, places |
| Contact / Support / About / Privacy | root HTML | Trust & support — footer SoT |
| Articles / education | `/education/` (if retained) | Supporting content — not primary product |

---

## Navigation contract

### Global (App Shell)

- Brand → Studio Home
- Product switcher / launcher emphasizing **Dashboard · Scenes · Sheds**
- Apps directory may list incubator with maturity chips — visually secondary

### Local (per product)

| Product | Local nav examples |
|---------|-------------------|
| Dashboard | Workspace · Customize · (Kiosk entry) · Place/Sources as actions |
| Scenes | Hub modules matching catalog; always path back to Scenes home |
| Sheds | Map-centric; secondary: observations, education — avoid stealing map viewport |

### Footer

Support and legal only — not a second app directory.

---

## Cross-product deep links

Allowed patterns (query/hash contracts to be finalized at implementation):

| From | To | Intent |
|------|----|--------|
| Dashboard | `/apps/photo-coach/` | Review today’s shoot |
| Dashboard | `/apps/shed-hunting/map/` | Open field map |
| Scenes | `/apps/dashboard/` | Check light/conditions workspace |
| Sheds | `/apps/dashboard/` | Richer instruments (rare) |

Deep links must open the **destination product shell**, not iframe-merge souls.

---

## Redirect & legacy policy

| Legacy / historical meaning | Rebuild action |
|-----------------------------|----------------|
| Outdoor OS as `/apps/dashboard/` presentation | Replace presentation after implementation mandate; URL may stay |
| Recovery/V2/V3 flags as product path | Do not restore as default |
| `/apps/scenes/photo-coach/` → Photo Coach | Keep redirects |
| Duplicate map entries | Single canonical Sheds map |

Document production redirect tables in release engineering when routes change; this file is the product contract.

---

## Registry alignment

Implementation should update:

- `design-system/ecosystem/nav-registry.json`
- `design-system/js/platform/wds-app-nav-config.js`
- Studio home launch cards
- Any `foundation.json` / Pages route maps

Labels: prefer **Dashboard** (not “Outside” as permanent product name unless owner keeps brand alias). If “Outside” remains a marketing alias, registry must map it clearly to Dashboard.

---

## Non-goals

- Promoting Volunteer / Incubator to primary-three peers without amending product vision
- Breaking Photo Coach bookmarks without redirects
- Using routing to smuggle Outdoor OS back as canonical by “compatibility”
