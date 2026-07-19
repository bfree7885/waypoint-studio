# Performance Observations

**Method:** Playwright navigation timing (`performance.getEntriesByType('navigation')`) plus a custom “usable content” wait (polls for boot/loading/busy markers up to **15s**).  
**Not Lighthouse.** Do not treat these as laboratory CWV scores.

**Run:** 2026-07-19 · https://waypointstudio.org · 110 route visits

---

## Summary

| Signal | Observation |
| --- | --- |
| Studio marketing pages | Typically become usable in **&lt;500ms** after navigation in this run |
| ForageCast family | Often **~8–9s** usable wait (boot/provider work) without always tripping the 15s stuck flag |
| Dashboard | **&gt;15s** busy heuristic; visible UI still appears with “Partial success” (see DEFECTS) |
| Steepleaf explore/entity | **&gt;15s** stuck loading heuristic |
| ForageCast season-table | **&gt;15s** stuck loading heuristic |
| Document `loadEvent` | Many apps report loadEvent in the **~250–500ms** range even when usable-wait is long — JS boot continues after `load` |

---

## Slow or stuck (&gt;5s usable wait or still loading)

From automated results (desktop default + notable mobile/geo):

| Viewport | URL | usableMs | Stuck? |
| --- | --- | ---: | --- |
| desktop | /apps/dashboard/ | ~15000–15364 | **yes** |
| mobile | /apps/dashboard/ | ~15298 | **yes** |
| desktop | /apps/steepleaf/explore/ | ~15311 | **yes** |
| desktop | /apps/steepleaf/entity/ | ~15321 | **yes** |
| desktop | /apps/foragecast/season-table.html | ~15353 | **yes** |
| desktop | /apps/foragecast/ (+ many subpages) | ~8400–8915 | no |
| desktop | /apps/photo-coach/guide/ | ~8496 | no |

Full list: filter `route-results.json` where `timings.usableMs > 5000` or `timings.stuckLoading`.

---

## Largest / noisiest network patterns (not byte-ranked)

Automated capture prioritized **failures**, not transfer size. Dominant costs/noise:

1. **Mass `wds-*.css` 404s** — wasted round-trips on almost every page
2. **Missing `live.json` / `health.json`** on Dashboard and ForageCast
3. **Map tiles** (OSM) — including aborted requests during pan/zoom
4. Dashboard cold path — multiple provider calls; partial success banner

---

## Map smoke

```json
{
  "route": "https://waypointstudio.org/apps/shed-hunting/map/",
  "steps": ["loaded", "zoom-in-attempted", "pan-attempted"],
  "ok": true
}
```

Screenshots: `desktop/map__sheds_before.png`, `desktop/map__sheds_after.png`.  
Note: ethics modal present on first visit; tile `ERR_ABORTED` noise during zoom.

---

## Pages taking longer than 5 seconds to become usable

Treat ForageCast (~8–9s) and Dashboard/Steepleaf hangs as **product performance risks** for first-time visitors on mid-tier networks (this audit ran from a server environment with good connectivity — field devices may be worse).
