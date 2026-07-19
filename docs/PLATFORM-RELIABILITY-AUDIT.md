# Platform Reliability Audit

**Date:** 2026-07-18  
**Commit status:** Not committed.

---

## Mission

Users should never wonder whether the app is broken. Every fetch path should reach a **terminal state**: live, cached/stale (labeled), degraded/fallback (labeled), offline, or explicit error with recovery.

---

## Shared reliability contract (`WDS.resilience`)

| Capability | Behavior |
|---|---|
| Timeout | Default 8s (`AbortController`) |
| Retry | 1 retry by default; backoff + jitter; retries on timeout / 5xx / 429 / network |
| Coalesce | Identical in-flight URLs share one Promise |
| Memory cache | Fresh within `maxAgeMs` (default 5 min) |
| Persistent cache | `sessionStorage` fallback when network fails / offline |
| Offline | `navigator.onLine` + banner `#wds-offline-banner` |
| Provider health | Per-id status, latency, last error; Settings surfaces in FC/Savant |
| Freshness labels | Live / Cached / Offline cache / stale — honesty-first |

`WDS.platformUi.getJson` delegates to resilience when loaded.

---

## Application coverage

| App | Reliability posture | Notes |
|---|---|---|
| Dashboard | Strong (prior block) + resilience in `wds.js` | Widget terminal states already exist; OIP health now shared |
| ForageCast | Strong | Shell/home/prediction/property paths use platform getJson; Settings health |
| Savant | Good | Local/educational heavy; search debounce; Settings health |
| SignalTerrain | Improved | Shared `loadJson` now resilient |
| Volunteer | Improved | Weather via resilience; discover still has own fetch wrappers |
| Fieldry | Good | Lazy boot + storage tolerance (prior); resilience on page + platform loader |
| Steepleaf | Baseline | Platform scripts present; graph fetch still thin wrapper |
| Sheds | Mixed | Observation stores local; Leaflet map page separate; root links fixed |
| Photo Coach / Scenes / HL | Baseline | Platform UI/resilience on main HTML; less provider-bound |
| Studio Home | Baseline | Resilience injected |

---

## Failure matrix (platform)

| Scenario | Expected UX |
|---|---|
| Slow provider (>8s) | Timeout → retry once → stale cache if any → error/empty with honesty |
| Offline mid-session | Banner; cached payloads where persisted |
| Duplicate mount / double fetch | Coalesced |
| OIP weather soft-fail | Fallback weather package allowed (`fallback: true`) |
| Corrupted localStorage (Fieldry) | Safe empty list (prior hardening) |
| Map remount | Previous MapView destroyed (listeners + will-change cleared) |

---

## Automated verification

```text
node automation/test-platform-reliability.mjs  → pass
node automation/test-platform-hardening.mjs    → pass
node automation/test-dashboard-reliability.mjs → pass
node automation/audit-platform-routes.mjs      → 0 broken local refs
```

---

## Remaining reliability gaps

1. **Sheds Leaflet map** — not on shared MapView / resilience fetch path  
2. **Kiosk** — separate stack; not on platform-ui/resilience HTML injection  
3. **Steepleaf / some ST cyber modules** — still call `fetch` directly in places (util path covered)  
4. **Infinite polling** — SignalTerrain live / dashboard 5‑min refresh still intentional; need guardrails docs for future intervals  
5. **Service worker / true offline shell** — not in scope; session cache only  

---

## Verdict

Cross-app reliability is **meaningfully stronger**. Fragile “forever loading” paths are reduced. Remaining risk concentrates in **heavy script graphs** and **app-specific fetch islands** (Sheds map, kiosk, some cyber modules).
