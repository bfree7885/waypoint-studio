# Session Report — Scene Builder Dimming & Dashboard Progressive Performance

**Date:** 2026-07-14  
**Commit status:** Shipped as `bccb8d4` (first pass) and `1a2d851` (hydrate/overlay harden).  
**Playbook:** Lessons appended in `docs/ENGINEERING-PLAYBOOK.md`.

---

## Mission

1. Fix Scene Builder dimming / overlay defect (and similar `[hidden]`+`display` traps).
2. Improve Dashboard startup responsiveness via progressive rendering.
3. Leave the app measurably better through multi-role review cycles.

Prior commit `bccb8d4` shipped the initial compare-mount fix and first progressive-paint pass. This session hardened remaining overlay traps, eliminated duplicate provider fetches during shell paint, added in-place hydrate, cold-start shell, and accessibility/UX polish.

---

## Root causes

### Scene Builder dimming

| Cause | Detail |
|-------|--------|
| Primary | `#coach-compare-mount.coach-compare-mount` uses `display: flex`, which overrides the UA `[hidden]` stylesheet. Closed mount still painted a full-viewport `rgba(0,0,0,0.72)` scrim. |
| Fix | `.coach-compare-mount[hidden] { display: none !important }` (+ Escape/`close()` / mode-switch dismiss). |

### Related overlay traps (reliability)

| Surface | Issue | Fix |
|---------|-------|-----|
| Location prompt | `.wds-location-prompt { display:flex }` + `#wds-location-prompt[hidden]` on mount | `#wds-location-prompt[hidden], .wds-location-prompt[hidden]` |
| Modal | `.wds-modal { display:flex }` latent | `.wds-modal[hidden]` |
| Coach right column | `[hidden]` rule only inside mobile MQ | Unconditional `.coach-col--right[hidden]` |

### Dashboard perceived startup lag

| Cause | Detail |
|-------|--------|
| Gate | First useful UI waited on full `OIP.get()` (trails historically up to ~75s). |
| Flicker | Second `renderIntoMount` wiped the progressive grid when OIP arrived. |
| Dup fetch | Shell mounts called Open-Meteo / `OIP.get` while content-engine was assembling the same package. |
| Premature settle | `settleStaleMounts` promoted Loading → Unavailable before `meta.hydratedAt`. |
| Cold blank | No stored location → blank skeleton until geolocation finished. |
| Boot race | Concurrent `init` for same coords; duplicate nav scripts on index. |

---

## Architecture improvements

1. Progressive shell after `loadRegion`, before OIP.
2. `hydrateDashboardInPlace` — briefing/banner swap + `refreshDashboard` without full `innerHTML` wipe.
3. Mount UIs wait for platform on progressive shell (`allowDirectFetch` opt-in for legacy).
4. `activeInit` + `coordsKey` coalesce duplicate boots; `data-wdb-init-key` forces remount on region change.
5. `provisionalShellLocation()` paints national shell without inventing Kansas/engine coords.
6. Dashboard index loads nav/shell only via `wds.js` (no triple include).

---

## Performance

| Metric (intent) | Before | After |
|-----------------|--------|-------|
| Shell / grid | After full OIP | After region JSON (~network of one bundle) |
| First populated widget | Same as package complete | Same, without remount CLS from full wipe |
| Final provider completion | Unchanged OIP path | Trails late; weather/sky no duplicate Open-Meteo |

**CDP measured (local, Pike County seed):** progressive shell ready in **~277–311 ms**; Open-Meteo resource entries **≤ 3–4** on first boot (bounded assertion ≤ 4).

Duplicate Open-Meteo requests during boot are removed for outdoor/sky/weather UI progressive path.

---

## UX

- Loading tag → **Updating** (less “stuck” implication).
- Location finding copy retained; cold start shows national shell while locating.
- Boot error only if shell never became ready.
- Softer “Updating local conditions…” ops note.

---

## Accessibility

- Removed page-level `aria-live="polite"` on `#wds-content-engine` (avoid announcement storms on hydrate).
- `aria-busy` scoped to pre-shell mount; cleared on first shell + hydrate.
- Overlay `[hidden]` rules restore expected inert/non-visible behavior for AT and keyboard.

---

## Reliability

- `settleStaleMounts` requires `platform.meta.hydratedAt`.
- Interaction/settings bind-once flags.
- Similar dimming class of bugs swept in location prompt + modal + coach column.

---

## Tests

- `automation/test-dashboard-reliability.mjs` — tag label **Updating**
- `automation/test-stabilization-scene-dashboard.mjs` — overlays, hydrate, cold shell, settle gate, no dup nav scripts

---

## Remaining risks

1. National → county region swap remounts shell (brief flash) by design via init-key.
2. Trails still late; may sit on Updating briefly after other cards go Live.
3. No durable offline weather persistence beyond in-memory `lastPackage`.
4. CDP timing measurements not automated in CI.
5. Provisional shell with null lat/lng skips live weather until bootstrap completes (expected).

---

## Recommendations (next block)

1. Instrument `performance.mark` for shell / first Live widget / OIP done; assert in CDP smoke.
2. Persist last weather slice to `sessionStorage` for true offline cold start.
3. Audit ForageCast / Species pages for the same `[hidden]`+`display:flex` pattern.
4. Consider skeleton-preserving DOM patch for region swaps instead of full remount.

---

*End of session documentation.*
