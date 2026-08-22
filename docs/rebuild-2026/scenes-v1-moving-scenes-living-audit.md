# Living Scenes → Moving Scenes audit

Date: 2026-08-14  
Attack: Scenes V1 Attack 3

## Two historical meanings

1. Hub module `/apps/scenes/living-scenes/` — product placeholder (“Future experience”).
2. Early studio `/apps/waypoint-scenes/` — Effects Studio overlays + parallax + PNG snapshot.

## Decisions

| Code | Decision | Rationale |
|------|----------|-----------|
| Hub living-scenes page | Redirect to `/apps/moving-scenes/` | User-facing rename without breaking bookmarks |
| waypoint-scenes effect overlays | DORMANT | Whole-frame particle weather invents atmosphere; fails “preserve the photograph” |
| scene-analyzer heuristics | REBUILD into ms-analyze | Keep band/color ideas; add confidence + stable/wildlife locks |
| Animation engine registry | KEEP dormant | No sunk-cost deletion; not production default |
| Video export stubs | Superseded | MediaRecorder WebM/MP4 path in Moving Scenes |
| Internal `livingScenes` Library key | KEEP + sync | Avoid reckless rename; `movingScenes` is authoritative |

## Product bar

Moving Scenes succeeds when the photograph still feels like the user’s — it just feels alive. Prefer three excellent classes over nine mediocre ones.
