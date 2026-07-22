# Dashboard OS — Owner review (live captures)

Pure visual review of the **actual running product** at `apps/dashboard/`. Not mockups, not design renders.

## Capture metadata

| Field | Value |
|-------|--------|
| **URL** | `http://127.0.0.1:8799/apps/dashboard/` |
| **Server** | `python3 -m http.server 8799 --bind 127.0.0.1` from repo root |
| **Location** | Pike County, PA seeded in `localStorage` (`wds-location-v3`); resolved place shown as **Near Blooming Grove Township, Pike, PA** |
| **Capture timestamp (UTC)** | 2026-07-22T04:07–04:10Z |
| **Tooling** | Headless Chrome CDP against the live static server (cursor-ide-browser MCP tabs would not stay open in this session) |
| **Product code changes** | **None** — only this folder was created |

## Files

### `01-desktop-first-viewport.png`

- **Shows:** Desktop first viewport — hydrated Outside briefing with Happening headline, What matters, Do this (Day Arc peek also visible).
- **Viewport:** 1280×800 CSS px @ 2× DPR → 2560×1600 PNG
- **Hydrated / live:** Yes — live providers (Open-Meteo weather/AQ/DEM). Headline at capture: “Overcast, warm outside”.

### `02-mobile-first-viewport.png`

- **Shows:** Mobile first viewport — Happening / What matters / Do this (Look Closer also reaches first fold on this height).
- **Viewport:** 390×844 CSS px @ 2× DPR → 780×1688 PNG
- **Hydrated / live:** Yes. Headline at capture: “Open sky outside” (briefing refreshed on remount).

### `03-desktop-after-scroll.png`

- **Shows:** Desktop after first scroll (~0.9× viewport) — Day Arc, Live notice, Look Closer (Conditions / Light), Preferences.
- **Viewport:** 1280×800 @ 2×
- **Hydrated / live:** Yes — same live session pattern.

### `04-mobile-after-scroll.png`

- **Shows:** Mobile after first scroll — lower briefing, Look Closer, Preferences, footer chrome.
- **Viewport:** 390×844 @ 2×
- **Hydrated / live:** Yes.

### `05-alert-interrupt.png`

- **Shows:** Alert interrupt banner + remapped What matters / Do this for severe weather.
- **Viewport:** 1280×800 @ 2×
- **Hydrated / live:** Hydrated base briefing; **alert injected via console/render API** (no live NWS alert for this place at capture time).
- **Notes:** Injected sample: “Severe · Thunderstorm Watch until 6pm · Stay near shelter” using `WDS.dashboardOSRender.renderScreen` after live hydrate. Prefer real alert when available.

### `06-loading.png`

- **Shows:** Real loading UI — “Finding today’s conditions…” with skeleton bars and “Live data will fill in without freezing.”
- **Viewport:** 1280×800 @ 2×
- **Hydrated / live:** Live pre-hydrate loading (location already seeded; conditions still fetching). **No forced loading stub.**

### `07-location-detail-panel.png`

- **Shows:** Location detail panel open over hydrated briefing (Blooming Grove Township, Pike, PA; privacy copy; county/state search).
- **Viewport:** 1280×800 @ 2×
- **Hydrated / live:** Yes — opened via `[data-wdb-os-open="location"]` click.

### `08-conditions-detail-panel.png`

- **Shows:** Conditions detail panel — live temps, wind, precip chance, overcast narrative.
- **Viewport:** 1280×800 @ 2×
- **Hydrated / live:** Yes — opened via `[data-wdb-os-open="conditions"]`.

### `09-sources-panel.png`

- **Shows:** Sources / trust panel — provider rows (Open-Meteo live; NWS/USGS/etc. unavailable at capture).
- **Viewport:** 1280×800 @ 2×
- **Hydrated / live:** Yes — opened via `[data-wdb-os-open="sources"]`.

### `10-day-arc-look-closer.png`

- **Shows:** Day Arc detail panel open; Look Closer (Conditions / Light) visible in background after scroll.
- **Viewport:** 1280×800 @ 2×
- **Hydrated / live:** Yes — Day Arc panel opened via `[data-wdb-os-open="day-arc"]` click on live briefing.

### `11-owner-walkthrough.gif` (optional)

- **Shows:** Short walkthrough: first viewport → Location panel → Conditions panel → scroll → return to top.
- **Viewport:** 1280×800 @ 1× (frames downscaled 50% for GIF size)
- **Hydrated / live:** Yes
- **Notes:** `ffmpeg` / WebM not available on this machine; delivered as GIF instead. Not a substitute for the numbered PNG set.

## Limitations

- **Alert (`05`):** Console/render injection — no live NWS alert for Pike County at capture time.
- **Browser MCP:** cursor-ide-browser tab create/navigate was unreliable here; captures used the project’s established headless Chrome CDP path against the same live URL.
- **Walkthrough:** GIF instead of WebM/MP4 (`ffmpeg` missing).
- **Place line:** Seeded Pike County; geocode resolved to Blooming Grove Township, Pike, PA (honest product behavior).
- **Partial sources:** Some providers showed Unavailable (NWS, USGS Water, Overpass, Nominatim) — reflected honestly in Sources panel.
