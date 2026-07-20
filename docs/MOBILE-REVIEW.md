# Mobile Review — RC2 Sprint 5

**Date:** 2026-07-20  
**Viewports reviewed (automation):** 320, 375, 390, 430, 768, 1024, 1440 (+ landscape 844×390)

## Shared fixes

| Problem | Fix |
|---------|-----|
| Page-level horizontal scroll | `html, body { overflow-x: clip }` + `min-width: 0` on shell/main |
| Notch / home indicator clipping | Safe-area padding on `.was-global` / `.was-footer` |
| iOS focus zoom on forms | Inputs/selects/textareas ≥ 16px |
| Tiny CTAs | 44px min-height on pills, Knowledge chips, contact actions (full-width stack &lt;480px) |
| Home directory CLS | `#was-home-apps[aria-busy="true"]` min-height |
| Sticky nav overflow | Local nav remains touch-scrollable under 900px (existing); task-nav aliases keep nowrap + overflow-x |

## Page notes

| Surface | 320–430 | Tablet / desktop | Remaining |
|---------|---------|-----------------|-----------|
| Studio home | Hero wraps; search full width; journey cards stack | 2-col grid ≥720 | Long purpose copy still dense |
| Contact / Support | Actions stack; 44px controls | Comfortable reading width | — |
| Knowledge | Framework stages already 1-col ≤720; filter chips wrap | Wide page OK | Light demo cards on dark shell |
| Dashboard | Automation gate only; no widget IA change | V2 chrome | Location name wrap; timeline scroll |
| Scenes / Photo Coach | Shared buttons | — | Drop-zone product CSS |
| Fieldry / ForageCast | Task nav overflow-x | — | Filter bottom-sheet still debt |
| Sheds map | Not expanded this sprint | Immersive HUD | Thumb-reach / dense HUD |
| SignalTerrain tables | Local `.st-cyber-table-wrap` scroll helper | — | Dense tables |

## Automation

`automation/mobile-layout.mjs` now:

- Covers the full viewport matrix above.
- Adds about, contact, knowledge, support, settings, fieldry, foragecast.
- Fails on horizontal document scroll or panel overlaps.
- Logs (does not fail) when many sub-40px interactive nodes appear on phone widths.

```bash
python3 -m http.server 8080
node automation/mobile-layout.mjs http://127.0.0.1:8080
```

## Remaining mobile debt

1. Shared bottom-sheet primitive for filters.
2. Sheds HUD thumb-reach audit at 320.
3. SignalTerrain cyber table usability beyond overflow.
4. Landscape phone on map + Dashboard sticky chrome.
5. Optional Firefox mobile emulation in CI (Chromium CDP is the automated gate today).

## Related

- Prior Experience System V2 notes: `docs/Mobile-Review.md`
- Sprint QA summary: `docs/RC2-SPRINT5-QA.md`
