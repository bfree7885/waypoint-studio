# Owner Review — Global Signals (Side Trails)

**Date:** 2026-08-06  
**Branch:** `feature/global-signals-side-trails`  
**Base:** `feature/signalterrain-intelligence-map-design` (`aa408fa`)  
**Product:** Global Signals · Side Trails · Waypoint Studio  
**Deployed:** No  
**Merged:** No

---

## Verdict

**Approve Global Signals as a new Experimental Side Trails project.**

Shipped: public landing page, catalog card, mission, philosophy, roadmap, and
the requested explanatory sections. This is a product story — not a news site
and not an application implementation.

---

## What shipped

| Item | Detail |
| --- | --- |
| Landing | `/side-trails/global-signals/` |
| Status | Experimental |
| Tagline | Understanding how world events shape everyday life. |
| Catalog CTA | Explore Global Signals |
| Icon | Globe / signals SVG |
| Docs | `docs/side-trails/global-signals.md` |

### Landing includes

- Mission  
- Philosophy  
- Why Relationships Matter  
- Why Headlines Are Not Enough  
- How Global Signals Works  
- Why Citizens Should Care  
- Roadmap  
- Footer: Part of Side Trails  

---

## Honesty notes

- Explicitly positioned as an **intelligence platform**, not a news website.  
- No live event feed, fabricated headlines, or application functionality.  
- Schematic illustration labeled as non-live.  

---

## Tests

```bash
node automation/test-global-signals.mjs
node automation/test-side-trails.mjs
```

---

## Risks / remaining

1. Confirm working title **Global Signals** vs a future permanent name.  
2. Next engineering block: signal taxonomy + relationship schema (documented as “Next” on the roadmap).  
3. Optional OG image for sharing.

---

## Recommendation

**Approve.** Do not merge until owner confirms naming and landing copy.
