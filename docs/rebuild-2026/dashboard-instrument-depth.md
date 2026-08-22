# Dashboard instrument depth (2026)

**Status:** Shipped with Rebuild Home  
**Pattern:** In-tile disclosure (`Details` → supporting facts / timing / evidence / source)  
**Module:** `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-depth.js`

## Interaction model

```
GLANCE → NOTICE → OPEN → UNDERSTAND
```

One consistent pattern for every live instrument (except Before You Go, which is already synthesized depth):

1. Collapsed tile answers the primary question in ~2–3 seconds.
2. Subtle **Details** control (`aria-expanded` / `aria-controls`) opens an in-tile panel.
3. **Close details** or **Escape** closes and restores focus.
4. Customize / reorder mode omits depth (no accidental opens).
5. Happening Now “View instrument” scrolls, focuses, and opens the related instrument’s depth.

No modals. No permanent taller tiles. No second weather fetch.

## Collapsed vs depth

| Instrument | Collapsed question | Depth purpose |
|---|---|---|
| Conditions | What is it like outside right now? | Supporting measurements, feels-like when meaningful, today’s envelope, source/freshness |
| Next hours | What changes soon? | Change headline + concise hourly progression + temp sparkline |
| Rain timing | When might I actually get wet? | Probability vs observed, first elevated / peak / easing, precip sparkline |
| Wind | How windy is it? | Sustained/gust/dir + near-term progression + strongest soon |
| Air | Is the air good for being outside? | AQI, category meaning, PM2.5 only when present, source |
| UV | How strong is solar UV? | Current / daily max / approximate peak timing when hourly exists |
| Light | What natural light is happening or coming? | Phase + sun windows + optional Scenes action when intel justifies |
| Astronomy | What is happening overhead tonight? | Phase / illum / waxing-waning / cloud context; moonrise only if real; optional Scenes |
| Alerts | Is there an official hazard? | Official title, severity, effective/expiry, concise description, link |
| Today’s range | What is today’s temperature envelope? | High/low + now-in-range micro bar — **KEEP** (unique envelope framing) |
| How it feels | (optional / saved layouts) | Remains cataloged `defaultVisible: false`; meaningful feel logic lives in Conditions depth |
| Before you go | What should I know before heading out? | No depth panel — brief already is the depth |

## Decisions

### Today’s range — KEEP
Depth adds current position within the daily span. Distinct from Conditions’ “right now” framing.

### How it feels — MERGE into Conditions (compat retained)
- Feels-like appears on Conditions glance/depth only when \|Δ\| ≥ 3°F.
- Catalog entry `ph-comfort` stays for saved/custom layouts; depth notes Conditions absorbs the reading.
- Default experience does not show a separate comfort tile (`defaultVisible: false`, unchanged).

## Source + freshness

Exposed only in depth: Updated, Freshness (cached/stale), Source. Collapsed tiles stay uncluttered.

## Missing data

Depth omits empty rows. No dash grids. No fabricated pressure trends, pollutants, moonrise/moonset, or precip amounts.

## Micro-visualizations

Restrained SVG polylines / range bar only when series exist (temp, precip %, gust, UV, range position). No chart libraries.

## Tests

`automation/test-dashboard-rebuild-depth.mjs` — deterministic fixtures covering feels-like thresholds, change vs stable hours, rain timing, wind, air, UV, light, astronomy, alerts, missing/stale data, HN→depth, keyboard Escape, mobile markup, saved How it feels layout, customize omission.

## Stop condition

This pass completes the Dashboard v1 depth contract. Next step is **owner review** — not another feature/art pass.
