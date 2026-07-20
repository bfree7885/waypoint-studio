# Performance Comparison — Sprint 10

## Baseline (Playwright usable-wait, production 2026-07-19)

| Surface | Usable wait | Stuck &gt;15s? |
| --- | ---: | --- |
| Marketing / About / Privacy | typically &lt;500ms | no |
| ForageCast family | ~8–9s | season-table **yes** |
| Dashboard | ~15s | **yes** |
| Steepleaf explore/entity | ~15s | **yes** |
| Photo Coach guide | ~8.5s | no |
| Sheds map smoke | interactive after ethics | pan/zoom OK |

Method notes: not Lighthouse; `loadEvent` often ~250–500ms while JS boot continues.

## Intended improvements (recovery tree — not remeasured live)

| Area | Change | Expected effect |
| --- | --- | --- |
| Steepleaf explore/entity | Boot watch + fail/retry; parse bugfix | Exit hang or Retry instead of infinite busy |
| ForageCast season-table | Boot watch 15s + soft loc fallback | Same |
| Dashboard | `aria-busy` clear; provider classification; Today Outside path | Less false “still loading”; partial UI honest earlier |
| Volunteer / Savant / LI | Boot watch + debounced search | Fewer silent hangs |
| Live feed paths | Absolute `/data/live.json` | Fewer wasted 404 round-trips |
| GPS denial memory | Sheds / Volunteer | Fewer repeated geolocation stalls |

## Still slow (accepted for Closed Beta)

| Issue | Why it remains |
| --- | --- |
| Dashboard cold module graph (~100+ scripts historically) | No bundle split sprint |
| ForageCast ~8s provider boot | Educational index + weather still chained |
| SignalTerrain `live.json` size (~2MB class) | Sample/live briefing weight |
| Map tile aborts | Expected during pan; noisy but non-blocking |

## Measurable claim we will **not** make

We will **not** claim “performance improved X% on production” without a second Playwright run.  
Automation proves contracts; it does not prove CWV.

## Closed-beta performance bar

- No infinite busy without Retry  
- Marketing pages remain snappy  
- Field apps usable outdoors with honesty when slow  

## Public RC1 performance bar (future)

- Dashboard interactive briefing &lt;5s on mid-tier mobile mid-network  
- ForageCast overview &lt;5s common case  
- Eliminate mass failed CSS requests if any remain real (axe noise excluded)
