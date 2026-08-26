# Sheds V3.2 — Why this may matter

**Slice:** Inspect explainability (follow-up to Inspect Facts `bec1e9fc`)  
**Date:** 2026-08-26  
**Branch:** `chore/product-direction-reconciliation`

Facts stay facts. Why lines are deterministic interpretations of **supported** inputs only. Missing facts produce no Why line.

HUD order: **What is here** → **Why this may matter** → **Limits**

---

## Deterministic rules

| id | Required input | Why line | Class |
| --- | --- | --- | --- |
| `slope-flat` | slope ready, &lt; 2° | Nearly flat ground is generally easy to walk. | PHYSICAL |
| `slope-moderate` | slope ready, 2–12° | Moderate slope is generally walkable. | PHYSICAL |
| `slope-steeper` | slope ready, 12–25° | Steeper terrain may slow walking. | PHYSICAL |
| `slope-steep` | slope ready, ≥ 25° | Steep terrain may make walking slower and more tiring. | PHYSICAL |
| `solar-south` | aspect ready, NH south-facing | {Facing} terrain receives relatively more winter sun in the Northern Hemisphere. | PHYSICAL |
| `solar-north` | aspect ready, NH north-facing | {Facing} terrain receives less direct winter sun and may hold snow longer. | PHYSICAL |
| `solar-mixed` | aspect ready, east/west | East–west aspect means solar exposure differences are modest here. | PHYSICAL |
| `solar-southern` | aspect ready, lat &lt; 0 | Aspect is available; solar notes are tuned for Northern Hemisphere winters. | PHYSICAL |
| `edge-near` | land-cover `edgeM` ≤ 90 m | A land-cover edge is nearby (~N m). That change in cover can be worth inspecting. | EDITORIAL_HEURISTIC (inspection, not wildlife) |
| `elev-context` | elevation ready **and** no other Why line | This point sits at {ft} — geographic context only, not habitat quality. | PHYSICAL |

Same inputs always yield the same `id` + `text` (`buildWhyLines`).

## What is not interpreted

- Unavailable, failed, or loading slope / aspect / edge / elevation
- Aspect on nearly flat ground (not defined — no solar Why)
- Land-cover edge &gt; 90 m (distance remains a **fact**; no “nearby edge” Why)
- Habitat suitability bands / `scorePoint`
- Wildlife presence, bedding, feeding, trails, movement, shed likelihood

## Limits (always)

> Terrain and land-cover context can help you decide where to look more closely. They do not indicate that deer or shed antlers are present.

Also: Inspect is not an observation of wildlife.

## Honesty from Facts (preserved)

Partial / unavailable / failed / zero-value distinction is unchanged. No-data and failed HUDs omit Why entirely.
