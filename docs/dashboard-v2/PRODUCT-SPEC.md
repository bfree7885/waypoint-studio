# Dashboard V2 — Product Spec (Today Outside)

## Vision

Dashboard Version 2 is the daily **outdoor intelligence center**: a knowledgeable local field guide interpreting the day—not a weather widget grid.

## Core experience: Today Outside

Interpreted daily briefing with sections:

1. **What it feels like** — current outdoor character
2. **What changes today** — meaningful transitions
3. **Best opportunities** — activity-aligned possibilities
4. **Use caution** — official alerts + environmental cautions
5. **Worth noticing** — interesting environmental signals

## Information architecture

| Layer | V2 surface |
|-------|------------|
| Immediate conditions | Compact overview panels (tap → detail tab) |
| Today Outside | Central briefing |
| Timeline | Next 24 hours (scrollable on mobile) |
| Activity intelligence | Suitability + reasoning (not opaque scores) |
| Environmental detail | Existing recovery tabs (unchanged) |
| Alerts & cautions | Unified official / dashboard / provider status |
| Observation opportunities | Observe Today + optional Studio links |
| Provider trust | Collapsible trust table |

## Non-negotiables

- Honest uncertainty; no fabricated readings
- No social/gamification/generic AI chat
- Local-first preferences (no account)
- Progressive startup; no provider blocks shell
- Safe location labels (never `null`, `0,0`, `NULL, NY`)

## Feature flag

- `localStorage` key: `waypoint-dashboard-v2`
- Default: **on** (`"1"` or unset)
- Set `"0"` to restore V1 summary header only (tabs unchanged)

## Out of scope (this session)

- Playwright suite (not in repo)
- Remote generative AI briefing
- Pollen / trail closure new providers
- Full settings UI for V2 prefs (storage + defaults only)
