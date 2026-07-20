# Volunteer Recovery Report — Sprint 9

## Goal

Make Waypoint Volunteer a calm **discovery** surface for “What good can I do here today?” — not volunteer management, not social networking.

## QA evidence (2026-07-19)

| Finding | Response |
| --- | --- |
| Overall **5.9** / clarity **5** | Stronger mission copy, category clarity, citizen-science strip |
| Sample-language flags | Honesty badges retained; place honesty added |
| Systemic `wds-*.css` 404 noise | Documented as axe/path measurement issue (Sprint 1); real CSS loads via `/design-system/css/` |
| Shell navigable | Boot watch + retry on Discover |

## Before → After

| Area | Before | After |
| --- | --- | --- |
| Location | Fixed Pike County sample only | Device GPS when allowed; denial remembered; labeled sample fallback |
| Search | Filters only | Free-text search + existing filters |
| Bridges | `bridgeApps` data unused | Rendered links to Fieldry, Sheds, ForageCast, Scenes, LI, etc. |
| Citizen science | Category only | Dedicated strip + observation-app links |
| Boot | Busy text, no timeout | `platformBoot.watch` + Retry |
| Mobile | Uneven targets | 16px inputs, 44px controls, viewport-fit |

## Honest limits

- Catalog remains **demo samples** (not live regional feeds)
- No registration, hours tracking, or org CRM
- Distance honesty depends on GPS grant

## Verification

```bash
node automation/test-sprint9-volunteer-landscape.mjs
node automation/test-waypoint-volunteer.mjs
```
