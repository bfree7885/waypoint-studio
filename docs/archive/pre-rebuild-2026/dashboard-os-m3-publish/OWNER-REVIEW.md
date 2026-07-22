# Dashboard Outdoor OS — Milestone 3 Publish Gate

**Date:** 2026-07-22  
**Authority:** Manifesto → Screen Spec → Architecture Reset → M2/M3 approvals → Reconcile gate → this publish gate  
**Live URL:** https://waypointstudio.org/apps/dashboard/

---

## Verdict

Outdoor OS (M2 intelligence + M3 polish + publish hardening) is **live on production** at merge SHA `45dc889`. `/apps/dashboard/` serves Outside Outdoor OS — not Recovery/V2/V3. Build fingerprint matches. Safety branches retained.

**Final status: LIVE AND VERIFIED**

---

## 1. Mission scope executed

| Phase | Result |
|-------|--------|
| 1 Resolve risks (legacy access, V2 count, Day Arc fold) | Done |
| 2 Final validation (tests, build, local serve) | Done |
| 3 Commit hardening | Done (`4143c26`, plus CI follow-ups) |
| 4 Push + PR | Done — PR #1 |
| 5 Merge | Done — `45dc889` |
| 6 Deploy Pages | Done — run `29894734616` |
| 7 Live verification | Done — screenshots under `docs/dashboard-os-m3-publish/live/` |

---

## 2. Safety branches (must remain)

| Branch | SHA | Role |
|--------|-----|------|
| `backup/dashboard-os-m3-pre-reconcile` | `942483b` | Pre-reconcile WIP snapshot |
| `recovery/dashboard-os-m3-reconcile` | `d0776ad` | Clean M2+M3 without RC3 |
| `integration/dashboard-os-m3` | tip includes publish commits | Integration line |

Do **not** delete these branches.

---

## 3. SHAs

| Label | SHA |
|-------|-----|
| Integration start | `ed70df6` |
| Harden commit | `4143c26` |
| Smoke align | `2cac8e5` |
| Animal Vision assert | `f18574c` |
| **Merge / origin/main / deploy** | **`45dc889c3f52c8eeb53c0bcd41b279dab645a79b`** |
| Rollback tip | `63fc457` (RC3) |
| PR | https://github.com/bfree7885/waypoint-studio/pull/1 |

---

## 4. Legacy V2/V3 access (risk 1)

**Hardening shipped:**

- Engine detects Outside (`data-product="dashboard"` / `/apps/dashboard/`) and **never** falls through to Recovery/widget-grid if OS missing
- Content engine treats Outside as Outdoor OS surface (skips legacy briefing/settings bind)
- V2/V3 comments: not production Outside presentation
- Regression tests in `test-dashboard-today-outside.mjs` (query/hash/localStorage cannot restore Recovery)

**Kept intentionally:** V2 model/prefs/timeline modules (OS `buildPayload`); V2/V3 render/kiosk for modular tests; `wds.js` still loads them (payload trim = future milestone).

Docs: `docs/dashboard-os-m3-publish/LEGACY-HARDENING.md`

---

## 5. V2 test count (risk 2)

**58 passed** — RC3 modular coverage retained + 7 OS asserts. No accidental duplicates; no snapshot suite validating legacy production Outside chrome. Do not reduce to match M2’s ~21.

Docs: `docs/dashboard-os-m3-publish/V2-TEST-COUNT.md`

---

## 6. Day Arc fold (risk 3)

Viewports audited: 1440×900, 1366×768, 1280×720, 1024×768, 390×844, 430×932. Priority Happening → What Matters → Do This preserved. Primary briefing visible. Day Arc may sit below fold depending on content; **not** compressed. Local audit: Day Arc above fold for mild content.

Docs: `docs/dashboard-os-m3-publish/FOLD-AUDIT.md`, `fold-audit.json`

---

## 7. Pre-merge validation

| Suite | Result |
|-------|--------|
| `test-dashboard-os-interpret.mjs` | 79 / 0 |
| `test-dashboard-v2.mjs` | 58 / 0 |
| `test-dashboard-today-outside.mjs` | all pass (incl. legacy regressions) |
| `test-dashboard-reliability.mjs` | 41 |
| Smoke (after align) | PASS |
| Production asset/link validators | PASS |
| Local CDP Outside checklist | PASS (incl. `?legacy=1#recovery` + V2/V3 flags) |

---

## 8. CI / PR / merge

- PR #1 opened from `integration/dashboard-os-m3` → `main`
- First CI fail: smoke required local nav (quiet chrome) — fixed
- Second CI fail: Animal Vision disclaimer assert (pre-existing on main) — fixed to interpretive copy
- CI success on `f18574c`
- Base remained `63fc457` at merge; mergeable_state `clean`
- Merged with normal merge commit → `45dc889`

---

## 9. Deployment

| Field | Value |
|-------|-------|
| Workflow | Deploy GitHub Pages |
| Run ID | `29894734616` |
| Conclusion | success (build + deploy + verify jobs) |
| Deploy SHA | `45dc889` |
| `meta[name=waypoint-build]` | `45dc889` |
| `data/build-info.json` | commit `45dc889…`, source `github-pages` |
| Skipped/cancelled | none |

---

## 10. Live verification

URL: https://waypointstudio.org/apps/dashboard/ (cache-bust + clean profile)

| Check | Result |
|-------|--------|
| Outdoor OS (`[data-wdb-os]`), brand Outside | Pass |
| Quiet chrome | Pass |
| No Recovery / V2 / V3 / Customize widgets | Pass |
| Build SHA `45dc889` | Pass |
| Sources panel | Pass |
| Keyboard Escape closes panel | Pass (local prod-equivalent; Sources open on live) |
| Mobile OS | Pass |
| Home / Scenes / Sheds shells | Pass |
| Console errors | none observed in harness |
| Day Arc peek | Absent while `weather.live` false — honest empty peek (not legacy UI) |
| Happening | May show “Finding today’s conditions” until weather.live — honest loading |

Screenshots: `docs/dashboard-os-m3-publish/live/`  
Meta: `docs/dashboard-os-m3-publish/live-verification.json`

Open-Meteo / NWS / AQ requests observed HTTP 200 from the live page; first-paint OIP can still report weather unavailable — documented residual, not a presentation rollback.

---

## 11. Comparison vs approved integrated screenshots

Approved: `docs/dashboard-os-m3-review/after/` and reconcile `docs/dashboard-os-m3-reconcile/local/`.

Live captures retain Outside Outdoor OS structure, quiet chrome, Sources panel craft. Content-dependent Happening/Day Arc variance vs fully hydrated local Pike captures is expected under honest loading when weather.live is false.

---

## 12. Excluded operational noise (not committed)

- `data/live.json`, `data/health.json`, `data/publish-state.json`
- Local `status.html` / `debug.html` stamps
- `docs/PRODUCTION-ASSET-AUDIT.md` / broken-route report regenerations
- Build-metadata HTML stamps from local inject runs
- `__pycache__`, importer desktop

---

## 13. Rollback procedure

If owner requires revert:

1. Restore `main` to **`63fc457`** (owner-approved revert or FF)
2. Re-run Pages deploy; confirm build meta = `63fc457` short SHA
3. Verify live Dashboard returns to RC3 presentation

Code recovery: `backup/dashboard-os-m3-pre-reconcile` / `recovery/dashboard-os-m3-reconcile` / `63fc457`.

---

## 14. Remaining risks / follow-ups (not M4)

1. V2/V3 still in `wds.js` loader (payload) — trim Outside-only in a later milestone
2. Live weather attach timing can leave Happening/Day Arc empty longer than local — monitor providers / OIP settle
3. Stale `data/live.json` (Jul 19) on Pages — engine metadata only; user OIP is authoritative
4. Local divergent `main` tip (`6062b41`) must not be force-pushed

---

## 15. Product quality gate

Change improves: trust (no silent legacy restore), clarity (Outside-only route), reliability (CI smoke/AV asserts), maintainability (documented baselines).

---

## 16. Final status

# LIVE AND VERIFIED
