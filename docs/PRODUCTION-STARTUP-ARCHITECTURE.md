# Startup Architecture — Shared Boot

## Goal

Every application should initialize predictably: branded loading → progress → success, or timeout → clear failure + **Retry**.

## Shared API — `WDS.platformBoot`

| Method | Role |
| --- | --- |
| `html(options)` | Loading markup |
| `failHtml(options)` / `fail(el, options)` | Error + Retry / Studio home / Support |
| `mount(el, options)` | Paint loading; set `aria-busy=true` |
| `watch(el, options)` | After timeout (default 18s), convert loading → fail UI |
| `clear(el)` | Clear timer + busy when content replaces boot |

Files:

- `design-system/js/platform/wds-platform-boot.js`
- `design-system/css/wds-platform-boot.css`
- Loaded via `wds.js` and many app HTML script tags

## App patterns

1. **Static HTML boot shell** in the mount (`data-wds-boot`) for first paint before JS.
2. **JS mount** replaces shell with real UI and clears busy.
3. **Failures** use `platformBoot.fail` or app-specific retry.

## Hardening this sprint

- Steepleaf explore/entity: boot + watch + **promise `.catch`** (previously hung forever on graph load failure).
- Fixed Steepleaf explore **syntax error** that prevented the module from executing at all.

## Dashboard

- Progressive national/provisional shell → location bootstrap → hydrate.
- Providers must not run with `null` coords (see provider resilience).
- Boot error UI + 20s module-wait deadline remain in `home-boot.js`.

## Remaining startup risks

- Dashboard still loads a large sequential JS graph (`wds.js` ~120 modules) — cold start latency is structural.
- ForageCast season-table and other heavy pages may still feel slow; they should fail via boot watch rather than infinite “Opening…”.
- Not every historical loading string has been eliminated from every app; prefer platformBoot for new/changed mounts.
