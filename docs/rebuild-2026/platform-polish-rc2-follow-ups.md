# Platform Polish RC2 / Dashboard Sprint 6 — Documented Follow-ups

**Source:** `docs/rebuild-2026/platform-polish-rc2-owner-review.md`  
**Approved integration:** `integration/dashboard-rc25-sprint6` @ `e6a76d99b60c3cbf0fb12e60a6740fb702800447`  
**Merge decision:** APPROVE WITH DOCUMENTED FOLLOW-UPS  
**Date:** 2026-07-24  

Follow-ups below are extracted from the owner review only. They do **not** block this merge unless repository or product state has changed since the review.

---

## Required soon

### 1. Fix or waive `home-rc1` support.html architecture assert

| Field | Value |
|-------|--------|
| **Description** | Pre-existing `test-home-rc1.mjs` failure on `support.html` (copy still mentions patterns the assert rejects). Fails identically on `origin/main` (`a349e68`); not introduced by Sprint 6. |
| **User impact** | None for Dashboard users. CI / local contract noise may hide real regressions if left unaddressed. |
| **Priority** | High (engineering hygiene) |
| **Recommended future sprint** | Platform / Home RC follow-up or privacy/support copy pass already noted as unrelated dirty-tree work |
| **Blocks this merge?** | **No** — disclosed main baseline |

### 2. Retire or rewrite `test-dashboard-today-outside.mjs`

| Field | Value |
|-------|--------|
| **Description** | Suite asserts Outdoor OS CSS/title/nav/home-boot patterns that Rebuild-at-root replaced. Four failures identical on `origin/main`. |
| **User impact** | None for end users. Misleading red tests for Today Outside / Outdoor OS surface that no longer matches product. |
| **Priority** | High (test honesty) |
| **Recommended future sprint** | Dashboard Rebuild test-maintenance sprint |
| **Blocks this merge?** | **No** — disclosed main baseline |

---

## Worth improving later

### 3. Existing local prefs vs new default order/sizes

| Field | Value |
|-------|--------|
| **Description** | Users with saved `waypoint-dashboard-rebuild-prefs-v1` keep prior `order` / `sizes` until they hit Restore defaults. Family labels still appear for consecutive same-family widgets; default calm sizes (Air / Alerts `md`) apply only after restore or for new prefs. |
| **User impact** | Returning users may not see the calmer 3-up default rhythm until Restore defaults. |
| **Priority** | Medium |
| **Recommended future sprint** | Dashboard prefs / onboarding polish |
| **Blocks this merge?** | **No** |

### 4. Phone CDP OIP hydrate race

| Field | Value |
|-------|--------|
| **Description** | Phone CDP capture can occasionally race Observation in Place hydrate (mitigated in merge-gate run: phone facts=4). |
| **User impact** | Rare flaky capture/verification; not a known user-facing permanent empty state when network is healthy. |
| **Priority** | Medium (automation reliability) |
| **Recommended future sprint** | Dashboard capture harness hardening |
| **Blocks this merge?** | **No** |

---

## Optional refinement

### 5. Release notes: Restore defaults for family order/sizes

| Field | Value |
|-------|--------|
| **Description** | Optionally call out Restore defaults in release notes so users who want the new default order/sizes know how to get them. |
| **User impact** | Clarity for power users; no functional gap if omitted. |
| **Priority** | Low |
| **Recommended future sprint** | Next release-notes / changelog pass |
| **Blocks this merge?** | **No** |

### 6. Formal Lighthouse / RUM performance pass

| Field | Value |
|-------|--------|
| **Description** | Owner review explicitly did not claim Lighthouse/RUM; only observed CLS-oriented skeletons and hydrate `pending: 0` in capture. |
| **User impact** | Unknown until measured; no known Sprint 6 performance regression. |
| **Priority** | Low |
| **Recommended future sprint** | Platform performance audit |
| **Blocks this merge?** | **No** |

### 7. Full WCAG accessibility audit

| Field | Value |
|-------|--------|
| **Description** | Contract-covered a11y (SR “Settling…”, reduced motion, ≥44px targets retained) is not a full WCAG audit. |
| **User impact** | Residual a11y gaps may exist outside Sprint 6 scope. |
| **Priority** | Low–medium |
| **Recommended future sprint** | Accessibility focused sprint |
| **Blocks this merge?** | **No** |

---

## Explicitly out of scope

| Item | Notes |
|------|--------|
| New widgets | Not part of Sprint 6; do not add in follow-up without a new sprint |
| Photography Library / Featured Library product work | Separate RC; not this merge |
| IA / nav redesign | Explicitly excluded |
| Mobile tile-editing re-implementation | Already on main (`26b3f32`); Sprint 6 does not rework it |
| Platform public-chrome RC2 / privacy HTML experiments | Stashed unrelated dirty tree; not in integration |
| Unrelated tip-SHA noise / Platform RC2 walkthrough commits | Excluded from reconcile by design |

---

## Merge gate statement

Documented follow-ups above **do not block** merge of `e6a76d99b60c3cbf0fb12e60a6740fb702800447` into `main`, provided pre-merge verification finds no new critical regression beyond the disclosed main baselines.
