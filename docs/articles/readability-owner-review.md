# Articles readability — Waypoint’s Take (owner review)

**Branch:** `feature/articles-waypoints-take-readability`  
**Date:** 2026-08-07  
**Status:** Ready for owner review — **do not merge** until approved  
**Scope:** Visual accessibility only (no Articles redesign)

## Problem

On the Articles hub (dark studio shell), Waypoint’s Take used a near-white wash:

`--waf-take: color-mix(..., 12%, #fff)`

while body text stayed light parchment (`--wds-text`). Result: **~1.17:1** contrast (fail), plus full-paragraph italics that hurt scanability.

## What changed

| Area | Change |
|------|--------|
| Articles Take surface | Dark elevated navy + subtle lime tint (no white wash) |
| Body type | Normal Inter body, not italic display |
| Label | Lime **Waypoint’s Take** retained |
| Emphasis | Lime left accent border |
| Meta / provenance | Quieter secondary color + top rule for scan separation |
| Spacing | Slightly roomier padding, `line-height: 1.65`, `max-width: ~48ch` |
| Shared `.wds-take` | Same readability rules in `wds-aurora-bridge.css` (Home / deepeners inherit) |
| GS Articles Take | Shared-pattern polish only: left accent, darker panel, AA body color, normal style |
| Focus | `:focus-visible` on Articles view chips + filter controls |

## Contrast audit (WCAG AA, 4.5:1 body)

Approximate sRGB composites (token-derived):

| Pair | Before | After | AA |
|------|--------|-------|----|
| Take body `#e4eaf4` on Take surface | **1.17:1** (lime 12% + `#fff`) | **~11.1:1** (lime 8% + navy-800) | Pass |
| Lime title `#c8f055` on Take surface | n/a (label OK on dark; body failed) | **~10.3:1** | Pass |
| Meta ~78% parchment on Take | failed with wash | **~7.4:1** | Pass |
| GS Take `#e4eaf4` on dark panel | already dark | **~15:1** | Pass |
| GS Take title `#7dd3a7` | already OK | **~10.1:1** | Pass |

### Surfaces reviewed

- **Desktop / mobile** Articles hub — Take panel readable; filters keep lime active + focus ring
- **Dark mode** — Articles is dark-by-default (studio tokens); light `#fff` Take wash removed
- **Keyboard** — view buttons + filter inputs gain `:focus-visible` outline
- **Hover** — view chips get a quieter border lift (no glow)

## Screenshots

| Shot | Path |
|------|------|
| Before (Take visible) | [`screenshots/before-take-focus.png`](./screenshots/before-take-focus.png) |
| After (Take visible) | [`screenshots/after-take-focus.png`](./screenshots/after-take-focus.png) |
| Before desktop viewport | [`screenshots/before-desktop.png`](./screenshots/before-desktop.png) |
| After desktop viewport | [`screenshots/after-desktop.png`](./screenshots/after-desktop.png) |
| After mobile tall (Take in view) | [`screenshots/after-mobile-tall.png`](./screenshots/after-mobile-tall.png) |

**Before:** white/italic Take over light gray-green gradient.  
**After:** dark Take panel, lime label + left bar, normal body, separated provenance line.

## Tests

`node automation/test-articles-rss.mjs` — asserts dark Take surface (no `#fff` wash), normal body style, meta separator, focus-visible, shared `.wds-take` lime title.

## Remaining issues (out of scope / follow-ups)

1. Hero tagline *“Curated field reading…”* remains short italic display — intentional marketing line, not Take body.
2. Placeholder text in search inputs is quieter than body (common pattern); not failing body copy.
3. Global Signals confidence badges use semantic colors (Observed / High / Medium / Low) — contrast is OK on dark; no redesign in this PR.
4. Production deploy still needs owner merge + Pages publish for live verification.

## Recommendation

**Approve and merge** when the before/after Take shots match expectation. Smallest correct fix; shared Take pattern stays calm and trustworthy.