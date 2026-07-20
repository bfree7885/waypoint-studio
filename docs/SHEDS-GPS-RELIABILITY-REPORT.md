# Sheds GPS Reliability Report — Sprint 6

## Goals

- Never leave the map unusable when GPS fails
- Prefer honest status over optimistic “finding…” loops
- Minimize battery / permission annoyance after denial

## Behaviors

| Situation | Behavior |
| --- | --- |
| No geolocation API | `unavailable` — explore map manually |
| Permission denied | Persist `waypoint-sheds-gps-denied-v1`; skip auto-locate; status explains retry via Locate |
| Timeout | Ask for clearer sky + Locate again |
| Success | Show ± accuracy; mark “approximate” when >80 m; optional heading |
| Offline | Banner notes tiles may be cached; GPS may still work when forced |
| Observation entry | **Use my GPS** re-acquires and pins save location; precision `gps` vs `map` |

## User controls

- Locate FAB / Here chip — `force: true` (retry after denial)
- Recenter — only when user has a fix but panned away
- Track mode — continuous watch (existing)

## Limits

- Browser geolocation quality varies (phone GPS vs desktop IP approx)
- High-accuracy timeout is 12s — intentional field tradeoff
- No background tracking when the tab is killed
- Denial memory is per-origin localStorage — clearing site data resets it

## Assessment

GPS is **field-adequate** for closed beta: denial and timeout no longer strand the session, and observation capture can pin to a fresh fix without leaving the sheet.
