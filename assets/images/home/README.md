# Homepage photography

Owner photography is the long-term identity of Waypoint Studio.

## Swap the hero in one place

Edit `assets/images/home/seasons/manifest.json`:

- `default.src` — fallback image
- `seasons.*.src` — seasonal files
- `seasons.*.placeholder` — set `true` until a dedicated owner photo exists

Then refresh. `js/home-hero.js` reads the manifest and picks the season from the visitor’s local month (Northern Hemisphere defaults).

## Current files

| File | Role |
|------|------|
| `hero.jpg` | Default / summer-adjacent landscape (existing Studio asset) |
| `seasons/summer.jpg` | Scenes product photography |
| `seasons/autumn.jpg` | Mist valley (Scenes) |
| `seasons/spring.jpg` | **PLACEHOLDER** — temporary stand-in until owner spring photo |
| `seasons/winter.jpg` | **PLACEHOLDER** — temporary stand-in until owner winter photo |
| `originals/` | Uncompressed source copies (not required at runtime) |

Replace placeholder files with owner JPEGs (recommended ~1920px wide, progressive, under ~300KB) and set `"placeholder": false`.

Do not commit private RAW libraries or unexported photo dumps.
