# SignalTerrain (SOTA)

Unpublished Waypoint field application for SOTA summit discovery and activation planning.

**SignalTerrain (SOTA/outdoor, unpublished) is a new product definition and is not the retired SignalTerrain Cyber product.**

This directory is served at `/apps/summit-signal/` in V0.1. That route is intentional. Do not move this app to `/apps/signalterrain/` — that URL belongs to the retired cyber surface and currently redirects.

**V0.1** is the foundation: a mobile-first map of retrieved SOTA summits, summit detail, nearby comparison, and basic search. It is not a finished hiking or radio product. Trail, parking, and routing data are not integrated yet.

Canonical documentation: [`docs/signal-terrain/V0.1.md`](../../docs/signal-terrain/V0.1.md)

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/apps/summit-signal/`.

Optional live SOTA fetch (falls back to the labeled fixture on failure): `?live=1`.

## Tests

```bash
node automation/test-summit-signal-v0-1.mjs
node automation/test-summit-signal-v0-1-map-mobile.mjs
```

## Isolation

This app does not import Shed Hunting modules, `design-system/signalterrain/**`, or `wds-signalterrain-*` (retired cyber runtime).

## Independence

SignalTerrain is an independent application and is not affiliated with or endorsed by Summits on the Air (SOTA).
