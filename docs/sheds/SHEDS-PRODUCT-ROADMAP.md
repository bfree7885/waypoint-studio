# Shed Hunting — product roadmap (canonical)

**Status:** Canonical for ShedHunting.org sequence and intelligence direction.  
**Audience:** Owners, engineers, and coding agents  
**Last updated:** 2026-09-03

When Shed Hunting version intent disagrees, **this file plus** [`docs/PRODUCT-DIRECTION.md`](../PRODUCT-DIRECTION.md) win. Do not implement a later increment because it appears here.

---

## What the product is

Shed Hunting helps a hunter decide **whether to go**, **where to look**, **how to work a plan**, and **what they actually did in the field**.

It is **not**:

- an antler-location predictor
- a deer-presence map
- turn-by-turn navigation
- a social network
- a claim that sheds or deer are at a coordinate

Search-priority / opportunity language is allowed. Find probability and “an antler is here” are not.

---

## Shipped and in-progress sequence

| Increment | Question | Status |
| --- | --- | --- |
| **V1.1** | Should I go today? | Shipped |
| **V1.2** | What are conditions like? | Shipped |
| **V1.3** | Where should I look? (search priority / Search Areas) | Shipped |
| **V1.4** | Save candidate places (Scout Spots) | Shipped |
| **V1.5** | Plan the search (Hunt Plans) | Shipped |
| **V1.6** | Work the plan in the field (Field Hunt Mode) | Shipped on ShedHunting.org |
| **V1.7** | Record where I searched and what I observed | Merged to Studio main. Dedicated-host publish is a separate owner gate. |
| **V1.8** | Hunt History | Shipped on ShedHunting.org. |
| **V1.9** | Condition Snapshots | **Shipped.** Factual environmental/context foundation for Hunt Records. Not the V2.x heat map. |
| **V2.0 Phase 1** | Search Priority Today (model + map) | **In development.** Model foundation merged; map integration in progress (relative search-interest wash + Why these bands today). Spec: `SHEDS-V2-0-PHASE1-SEARCH-PRIORITY-TODAY.md`. Not deployed. |

V1.7 Hunt Tracks, observations, Shed Found records, and Hunt Records exist so later versions can use **private first-party field history**. They are not a heat map. V1.8 Hunt History is the review UI for those records. V1.9 stores a factual Condition Snapshot on new Hunt Records (weather/season/optional GPS altitude) without changing the History list.

---

## Flagship V2.x intelligence: dynamic search-priority map

**This is the flagship Sheds+ intelligence milestone.** V1.9 is shipped. **V2.0 Phase 1** delivers the pure model foundation and the first map integration of condition-aware relative search interest (not find probability). Do not skip to full Sheds+ visualization, personal-history heat, accounts, or new habitat packs in Phase 1.

The map should **change as real conditions change**. Relative **search priority / opportunity** may shift. Example: an area that is Moderate today may become Higher after warming, snowmelt, better seasonal timing, and improved searchability. The hunter must be able to understand **why** the rank changed.

Defensible inputs (when data exists and is honestly labeled):

- season timing
- recent weather
- forecast
- snow presence / depth / melt
- freeze/thaw
- terrain
- aspect / solar exposure
- elevation
- land cover / habitat
- access / searchability
- eventually the hunter’s own **private** hunt history (tracks, observations, Shed Found)

The map must **never** claim:

- sheds are present
- deer are present
- an antler exists at a coordinate
- a probability unsupported by evidence

Later V2.x deepening (still not V1.7):

- richer terrain/data inputs
- snow/melt progression
- weather history/forecast
- land cover/habitat
- access/searchability
- personal hunt history
- improved explainability
- offline intelligence groundwork

Existing V1.3 search-priority and habitat/heat layers stay available as today’s field tools. They are **not** this V2.x dynamic map and must not be marketed as proven antler locations.

---

## V3.0 — production field product

Not started. Do not begin because it is listed here.

- production iPhone app
- production Android app
- serious offline field capability
- Sheds / Sheds+ commercial system
- field beta
- hard public launch

Do **not** implement payments or accounts in V1.7.

---

## Sheds / Sheds+ (direction only)

| Tier | Job |
| --- | --- |
| **Sheds (free)** | Should I go today? Work a plan in the field. Keep a private local record of this hunt. |
| **Sheds+ (future paid)** | Flagship: the **dynamic shifting search-priority map**, plus historical/private-intelligence features that need Hunt History. |

Do not hide currently working V1.1–V1.7 features behind a paywall. Do not implement checkout in this increment.

---

## Data classes and future B2B licensing

Architecture must keep these **distinct**. Mixing them is a product and legal defect.

| Class | Meaning | Commercial use |
| --- | --- | --- |
| **Third-party / raw licensed data** | Weather, elevation, land cover, parcels, etc. obtained under a vendor license | Only as that license allows. Preserve provenance. |
| **Sheds-derived intelligence** | Search-priority / opportunity interpretations Waypoint computes from defensible inputs | May become a licensable Sheds product **if** it does not embed private user field data. |
| **Private user field data** | Hunt Tracks, observations, Shed Found, Scout Spots, Hunt Plans, Hunt Records | **Local to the hunter’s device.** Do **not** assume this can be commercially licensed. |
| **Opted-in aggregated data** | Only if a future system is explicitly built with informed opt-in | Never implied by V1.7–V1.8 local storage. Never silent upload. |

V1.8 still stores private field data on-device. No Hunt Track, Scout Spot, observation, or Shed Found coordinate is uploaded to Waypoint.

---

## Storage debt (V1.8 review)

V1.8 **kept localStorage**. IndexedDB was not introduced. Caps: 1,800 track points, 80 observations, **24** Hunt Records (raised from 12 because History is now a product surface). See [`docs/sheds/SHEDS-V1-8-HUNT-HISTORY.md`](SHEDS-V1-8-HUNT-HISTORY.md).

Migrate later when photos, offline tiles, multi-season archives, native apps, or quota failures make localStorage unsafe — not for architectural elegance.

---

## Release discipline

- Do not merge a later increment “because the roadmap exists.”
- Do not run `scripts/publish-shed-hunting-host.mjs` unless the owner asked to publish ShedHunting.org.
- Do not move `legacy-terrain-intelligence-2026-03-10` (immutable historical cutover marker). Immediate rollback uses the previous sheds-site commit SHA printed by the publisher.
