# Waypoint Scenes — Animation Engine

Modular effect system for landscape motion overlays.

## Architecture

```
js/engine/
  effect-base.js      Shared factory + param helpers
  registry.js         Register / lookup effect modules
  runtime.js          Single RAF loop, DOM + canvas orchestration
  effects/
    fog.js            DOM layer
    rain.js           Canvas particles
    snow.js
    fireflies.js
    cloud-drift.js    DOM layer
    light-rays.js     DOM layer
    dust-particles.js Canvas particles
    leaf-drift.js     Canvas particles
js/effects.js         Public facade (WaypointEffects)
```

## Effect module API

Each module registers with `WaypointEffectRegistry.register()` and implements:

| Capability | Description |
|------------|-------------|
| **Enable** | `onEnable(instance, ctx)` — mount / activate |
| **Disable** | `onDisable(instance, ctx)` — hide / teardown |
| **Opacity** | 0–100, controls visual strength |
| **Speed** | 0–100, animation / motion rate |
| **Density** | 0–100, particle count or layer richness |
| **Direction** | 0–360°, movement angle (0 = right, 90 = down) |

Runtime calls `setParam` / `setParams` on each instance. Multiple effects run together — canvas effects share one loop sorted by `zIndex`.

## Adding a new effect

1. Create `js/engine/effects/my-effect.js`
2. Register with id, name, layer (`dom` or `canvas`), defaults, and hooks
3. Add a `<script>` tag in `index.html` before `runtime.js`

See `js/engine/registry.js` for the registration template comment.

## Run locally

```bash
python3 -m http.server 8080
```
