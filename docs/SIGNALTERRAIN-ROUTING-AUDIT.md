# SignalTerrain — Routing Audit (Sprint 5)

## Canonical destinations

| Path | Status | Notes |
| --- | --- | --- |
| `/apps/signalterrain/` | OK | Foundation home; CTA → Live brief |
| `/apps/signalterrain/cyber/` | OK | Redirect → `live.html` |
| `/apps/signalterrain/cyber/live.html` | OK | **Production** cyber home (`#brief` default) |
| `/apps/signalterrain/cyber/workspace.html` | OK | Workspace |
| `/apps/signalterrain/cyber/ingest-health.html` | OK | Internal health |
| `/apps/signalterrain/summary.html` | OK | **Samples** — labeled |
| `/apps/signalterrain/topics.html` | OK | **Samples** |
| `/apps/signalterrain/graph.html` | OK | **Samples** |
| `/apps/signalterrain/cyber/brief.html` | OK | **Sample scenarios** — banner points to Live |
| `/apps/signalterrain/cyber/teaching.html` etc. | OK | **Samples** |
| `/apps/signalterrain/receivers/` | Not built | `ready: false` — not linked in Open now |
| `/apps/signalterrain/incidents/` | Not built | `ready: false` |
| `/apps/signalterrain/audio/` | Not built | `ready: false` |

## Hash aliases (Live)

`posture` / `today` / `immediate` → `#brief` · `providers` / `about` → `#feeds` · `profile` → `#settings` · `releases` → `#advisories` · `signal` → `#briefings`

## Changes this sprint

1. Foundation + static home CTA → `cyber/live.html#brief`
2. Nav registry: Live brief first; sample labels
3. Unbuilt paths remain `ready: false` (foundation already filtered)

## Remaining

- Optional hard redirect `brief.html` → Live (kept as demoted sample for teaching)
- Studio-wide relative CSS 404 noise (not ST-only)
