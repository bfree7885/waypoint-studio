# SignalTerrain (SOTA)

Unpublished Waypoint field application for SOTA summit discovery and activation planning.

**SignalTerrain (SOTA/outdoor, unpublished) is a new product definition and is not the retired SignalTerrain Cyber product.**

This directory is served at `/apps/summit-signal/` in V0.1. That route is intentional. Do not move this app to `/apps/signalterrain/` — that URL belongs to the retired cyber surface and currently redirects.

**V0.7** adds an Activation Plan and Field Readiness summary on top of V0.6 Route to Activation Zone. Slide and Hunter AZ/route acceptance are unchanged. SignalTerrain remains unpublished.

Canonical documentation: [`docs/signal-terrain/V0.1.md`](../../docs/signal-terrain/V0.1.md) · [`docs/signal-terrain/V0.2.md`](../../docs/signal-terrain/V0.2.md) · [`docs/signal-terrain/V0.3.md`](../../docs/signal-terrain/V0.3.md) · [`docs/signal-terrain/V0.4.md`](../../docs/signal-terrain/V0.4.md) · [`docs/signal-terrain/V0.5.md`](../../docs/signal-terrain/V0.5.md) · [`docs/signal-terrain/V0.6.md`](../../docs/signal-terrain/V0.6.md) · [`docs/signal-terrain/V0.7.md`](../../docs/signal-terrain/V0.7.md)

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080/apps/summit-signal/`.

Optional live SOTA fetch (falls back to the labeled fixture on failure): `?live=1`.

## Tests

```bash
node automation/test-signalterrain-sota-v0-7.mjs
node automation/test-signalterrain-sota-v0-6.mjs
node automation/test-signalterrain-sota-v0-5.mjs
node automation/test-signalterrain-sota-v0-4.mjs
node automation/test-signalterrain-sota-v0-3.mjs
node automation/test-signalterrain-sota-v0-2.mjs
node automation/test-summit-signal-v0-1.mjs
node automation/test-summit-signal-v0-1-map-mobile.mjs
```

## Isolation

This app does not import Shed Hunting modules, `design-system/signalterrain/**`, or `wds-signalterrain-*` (retired cyber runtime).

## Independence

SignalTerrain is an independent application and is not affiliated with or endorsed by Summits on the Air (SOTA).
