# Mobile Review — Experience System V2

## Shared improvements

- 44px minimum touch targets on shared buttons and task links
- Empty-page actions flex full-width under 480px
- Card padding tightens on small screens
- Horizontal task/nav scroll remains touch-friendly
- Reduced-motion respected for skeletons

## App notes

| Surface | Mobile status |
|---------|---------------|
| Dashboard | Compact panels + timeline scroll (V2); critical skeleton lighter |
| ForageCast / Savant / Fieldry | Task nav overflow-x OK |
| Sheds map | Immersive; skip fixed; HUD still dense on 320px |
| Photo Coach | Buttons now shared; drop-zone CTAs retain product CSS |
| Landscape Interpretation | Reading-friendly; fonts on token rails |
| Studio home / About / Contact | No CSS dupes; shell density unchanged |

## Viewports to re-check (owner)

- 320 / 375 / 390 / 430 width
- Landscape phone on Sheds map + Dashboard
- Tablet 768–1024 on Scenes landing

## Remaining mobile debt

1. Bottom-sheet standard for filters (not universal)
2. Sheds HUD thumb-reach audit
3. SignalTerrain cyber tables on narrow screens
4. Long location names in Dashboard header wrapping QA
