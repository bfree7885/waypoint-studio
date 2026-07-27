# Turnaround Sprint 5 — Scenes Surface Cleanup

**Date:** 2026-07-26  
**Branch:** `turnaround/sprint-05-scenes-surface-cleanup`  
**Base:** Sprint 4 tip `6db767a`  
**Audit:** P1-003 portfolio absent · P1-004 Living Scenes preview-only · P2-004 legacy monolith promoted · P2-005 Photo Coach CSS on legacy paths · P2-010 Outdoor Journals absent

---

## Objective

Make the live Scenes experience accurately reflect what is genuinely available — no new product features.

---

## Live tools retained (prominent)

| Tool | Route | Hub placement |
| --- | --- | --- |
| Photo Coach · Shoot Review | `/apps/photo-coach/` | Hero primary CTA + Available now #1 |
| Photo Library | `/apps/photo-library/` | Hero quiet CTA + Available now #2 |
| Hidden Landscapes | `/apps/hidden-landscapes/` | Experimental section (not peer to craft tools) |

Local shell nav (unchanged intent): Today · Review a shoot · Your photographs · Other ways of seeing.

---

## Previews demoted

| Surface | Change |
| --- | --- |
| Living Scenes | Hub “Later/Create” → Future direction · Preview only · not finished · `noindex` |
| Scene Builder | Primary “Open early Scene Builder” demoted to ghost “Legacy studio · preview”; hub Future direction |
| Photographer Profile | Preview-only copy; early companion CTA labeled preview |
| `/apps/waypoint-scenes/` | Banner: not canonical; links to Scenes hub; eyebrow Legacy studio · preview |
| Photo Library detail | Futures labeled “future direction (not available)” — no “created / not yet” implication |
| Platform catalog + nav-registry | Futures removed from Scenes feature list / live one-liner |
| Contact app list | Scene Builder labeled “(preview)”; Photo Library + Hidden Landscapes added |

---

## Dead links removed / absent routes

- Hub does **not** link to `/apps/scenes/portfolio/` (route **404** — suite absent).
- Hub names Portfolio suite and Outdoor Journals as **not deployed / not available** (text only).
- No new portfolio or journals product pages were added.

---

## Hub language

Three clear bands:

1. **Available now** — Photo Coach · Shoot Review, Photo Library, articles  
2. **Experimental** — Hidden Landscapes  
3. **Future direction** — Living Scenes, Scene Builder, Profile (previews) · Outdoor Journals · Portfolio suite (absent)

Internal four-pillar vision preserved in `docs/scenes/FOUR-PILLAR-VISION.md` (not claimed as live capability). Architecture doc cross-links that honesty gate.

---

## Photo Coach CSS decoupling

| Before | After |
| --- | --- |
| `../waypoint-scenes/css/studio-shell.css` | `apps/photo-coach/css/studio-shell.css` (vendored) |
| `../waypoint-scenes/css/photo-coach.css` | `apps/photo-coach/css/photo-coach.css` (vendored) |

Same for `apps/photo-coach/profile/`. Note: `apps/photo-coach/css/LEGACY-CSS-NOTE.md`.

### Legacy dependencies remaining

- Photo Coach still loads **analysis / shoot JS** from `apps/waypoint-scenes/js/` (intentional; no broad redesign).
- Legacy studio at `/apps/waypoint-scenes/` remains reachable for exploration, clearly labeled.
- Vendored CSS copies can drift from the monolith until intentionally synced.

---

## Tests

```bash
node automation/test-scenes-surface-cleanup.mjs
# PASS — Scenes surface cleanup checks (8 pages crawled)
```

Checks: live pages exist · portfolio absent · hub honesty bands · no portfolio hrefs · Coach CSS local · nav-registry futures removed · preview labels · legacy banner · href crawl on key Scenes HTML.

Route probe: `docs/turnaround/2026-07-26-sprint-05/route-probe.json` (portfolio 404; all live/preview 200).

---

## Screenshots

`docs/turnaround/2026-07-26-sprint-05/`

| File | Viewport |
| --- | --- |
| `scenes-hub__desktop.png` / `scenes-hub__mobile.png` | Hub |
| `photo-coach__desktop.png` / `photo-coach__mobile.png` | Live Coach |
| `photo-library__desktop.png` | Live Library |
| `hidden-landscapes__desktop.png` | Experimental |
| `living-scenes-preview__desktop.png` | Preview |
| `scene-builder-preview__desktop.png` | Preview |
| `legacy-studio__desktop.png` / `legacy-studio__mobile.png` | Demoted monolith |

---

## Risks / follow-ups

- Discover / related-apps widgets may still surface catalog text until cache-bust on publish.
- JS coupling to `waypoint-scenes` remains the next honest-decoupling candidate.
- Portfolio sources (if any remain only in Git history/docs) must not reappear in public nav without a real deploy.

---

## Merge / deploy

**Not merged. Not deployed.** Branch pushed for review only.
