# RC1 Sprint 14–15 Recovery Audit

**Audit date:** 2026-07-20  
**Repository:** `/home/bryan/Projects/waypoint-studio-site/.tmp-audit/waypoint-studio` (`waypoint-studio`)  
**Last pushed commit (origin/main):** `96f3963` — *Ship Landscape Interpretation and strengthen Volunteer discovery.*  
**Constraint:** Read-only assessment first; no owner commit/push in this recovery pass.

---

## 1. Naming mismatch (critical finding)

The working tree and documents label this work as **Release Candidate Sprint 10** (after recovery sprints 1–9).

There are **no** repository artifacts titled Sprint 14 or Sprint 15:

- No `docs/*SPRINT14*`, `docs/*SPRINT15*`, or changelog entries for those numbers
- No agent-transcript evidence defining Sprint 14/15 scope beyond this recovery request
- RC1 report set on disk is byte-identical to `~/Desktop/WaypointStudio-RC1-Reports.zip` (created 2026-07-19 23:02 from these same files)

**Interpretation used for this audit:** the interrupted “Sprint 14/15” session corresponds to the **RC1 assessment + gate-fix package already labeled Sprint 10**, not a missing second product sprint that needs to be restarted.

---

## 2. Repository state at audit start (reconstructed)

As described by the owner (and confirmed before an accidental local checkpoint — see §7):

| Item | State |
| --- | --- |
| `origin/main` | `96f3963` |
| Tracked mods | `apps/landscape-interpretation/learn.html`, `docs/PRODUCTION-ROUTING-MAP.md`, `index.html` |
| Untracked RC1 reports | 10× `docs/RC1-*.md` |
| Untracked zip | `waypoint-audit.zip` (~56MB live-site QA bundle) |

Diff of the three tracked files (intentional Sprint 10 gate / docs fixes):

1. **`index.html`** — add Home footer/nav link to `contact.html` (contact platform contract).
2. **`apps/landscape-interpretation/learn.html`** — load `wds-platform-resilience.js` **before** `wds-platform-ui.js`.
3. **`docs/PRODUCTION-ROUTING-MAP.md`** — document Landscape Interpretation route; `/map/` → Sheds map; honesty holds for LI / Volunteer.

---

## 3. Per-document completeness

| Document | Classification | Notes |
| --- | --- | --- |
| `RC1-EXECUTIVE-SUMMARY.md` | **Complete** | Clear decision **B**; no placeholders/truncation |
| `RC1-READINESS-REPORT.md` | **Complete** | Honest method; refuses “tests ⇒ production fixed” |
| `RC1-PLATFORM-SCORECARD.md` | **Complete** | Overall ~6.7; Closed Beta band |
| `RC1-APPLICATION-SCORECARDS.md` | **Mostly complete / inconsistent** | LI overall **6.5** vs dimension mean **7.14** (Δ +0.64) — only material score contradiction |
| `RC1-ACCESSIBILITY-SUMMARY.md` | **Complete** | States no full SR audit in Sprint 10 |
| `RC1-PERFORMANCE-COMPARISON.md` | **Complete** | Refuses unmeasured % improvement claims |
| `RC1-TECHNICAL-DEBT-REGISTER.md` | **Complete** | Aligns with defects / roadmap |
| `RC1-REMAINING-CRITICAL-DEFECTS.md` | **Complete** | RCD-1..7 + S10 gate closures |
| `RC1-RECOMMENDED-NEXT-ROADMAP.md` | **Complete** | Closed Beta gate → Quality & Access → later |
| `RC1-SPRINT10-CHANGELOG.md` | **Complete** | Lists artifacts + gate fixes; decision B |
| `PRODUCTION-ROUTING-MAP.md` (mod) | **Complete / retain** | Consistent with recovery + LI honesty |
| `waypoint-audit.zip` | **Retain on disk; never commit** | Live QA inputs dated 2026-07-19; not an RC1 prose report |

### Scan results (placeholders / corruption)

- No `TODO` / `TBD` / `FIXME` / `lorem` / truncated `...` placeholders in RC1 docs
- Markdown structure intact; tables parse
- Decision **B — Ready for Closed Beta after fixing listed critical issues** is consistent across Executive, Readiness, Changelog, Roadmap, Platform scorecard
- Public RC1 (**A**) consistently deferred (a11y contrast, cold start, missing live re-audit)
- Referenced repair paths exist: `map/index.html`, `contact.html`, `design-system/js/platform/wds-platform-resilience.js`, `audits/live-site-qa/`

### Applications coverage

Scorecards cover Studio surfaces + field apps + Scenes suite + Animal Vision + Terrainbound (retired).  
On-disk `apps/photo-pipeline` and `apps/waypoint-scenes` are not separately scored (pipeline = tooling; scenes covered via Scenes hub) — **not treated as missing RC1 apps**.

---

## 4. What likely completed before the crash

| Workstream | Evidence | Status |
| --- | --- | --- |
| Recovery sprints 1–9 | Pushed history through `96f3963`; sprint docs + automation | **Complete (pushed)** |
| RC1 Sprint 10 assessment reports (10 markdown files) | Present; SHA-256 match Desktop zip from 2026-07-19 | **Complete (were untracked)** |
| Sprint 10 gate fixes (Contact link, LI resilience, routing map) | Diff matches changelog; resilience order verified | **Complete (were uncommitted)** |
| Live Playwright re-audit of production | Explicitly **not** claimed; baseline remains 2026-07-19 | **Not done (known gap)** |
| Anything labeled Sprint 14 or 15 | No files / no changelog | **Never started under those labels** |

Timestamps on RC1 files were bulk-aligned (~2026-07-20 00:11) when the workspace checkpointed; content still matches the earlier Desktop zip (2026-07-19 22:50), so reports were **not rewritten empty by the crash**.

---

## 5. Incomplete / risky items

1. **Landscape Interpretation overall score inconsistency** (only RC1 math defect).
2. **No post-recovery live Playwright run** — correctly documented; still blocks any public RC1 claim.
3. **`validate-production-links`**: 1 pre-existing broken ref (`apps/steepleaf/data/foundation.json` → `/explore/`) — **not** introduced by Sprint 10 gate fixes; out of scope unless owner expands repair.
4. **Accidental local commit `d172523`** created during agent root migration (`checkpoint before checking out master`) that bundled RC1 docs **and** `waypoint-audit.zip` — violates owner “do not commit zip” / “do not commit until review” intent. **Must be undone locally; must not be pushed.**

---

## 6. Files safe to retain vs requiring correction

### Safe to retain (content)

- All ten `docs/RC1-*.md` except LI overall cell in application scorecards  
- Gate edits to `index.html`, `learn.html`, `PRODUCTION-ROUTING-MAP.md`  
- `waypoint-audit.zip` on disk as evidence input (untracked only)

### Requires correction

| File | Action |
| --- | --- |
| `docs/RC1-APPLICATION-SCORECARDS.md` | Fix LI **Overall** to arithmetic-consistent **7.1** (keep Educational-only recommendation) |
| Git tip `d172523` | Mixed reset back to `96f3963` so zip is not in history; keep file contents in working tree uncommitted |
| `docs/PRODUCTION-ASSET-AUDIT.md` / `PRODUCTION-BROKEN-ROUTE-REPORT.md` | Regenerated as side effect of audit diagnostics — leave as tooling output; not Sprint 14/15 prose |

---

## 7. Test / build / diagnostics (Phase 1)

| Check | Result |
| --- | --- |
| `node automation/validate-production-assets.mjs` | **PASS** (Missing: 0) — *rewrote* `docs/PRODUCTION-ASSET-AUDIT.md` |
| `node automation/validate-production-links.mjs` | **FAIL** (1 broken: Steepleaf `/explore/`) — *rewrote* `docs/PRODUCTION-BROKEN-ROUTE-REPORT.md` |
| `node automation/test-production-recovery.mjs` | **PASS** |
| `node automation/test-production-repair.mjs` | **PASS** |
| `node automation/test-contact-platform.mjs` | **PASS** (122) — confirms Contact contract incl. home link expectation |
| `node automation/test-platform-reliability.mjs` | **PASS** — includes “all platform-ui pages include resilience” |
| `node automation/test-knowledge-platform.mjs` | **PASS** |
| `node automation/test-sprint9-volunteer-landscape.mjs` | **PASS** |
| Package/`npm run build` | N/A — static site; no root `package.json` build |
| HTML gate order | Resilience script precedes platform-ui on LI Learn |
| RC1 ↔ Desktop zip hashes | **All 10 MATCH** |

---

## 8. Exact proposed recovery actions (executed in Phase 2)

1. Write this audit file.  
2. `git reset --mixed 96f3963` to drop accidental checkpoint `d172523` while preserving working-tree files (RC1 docs + gate fixes + zip remain on disk; zip untracked).  
3. Ensure `waypoint-audit.zip` is **not** staged.  
4. Repair LI overall score **6.5 → 7.1** in `RC1-APPLICATION-SCORECARDS.md`; add one-line note that Overall ≈ mean of dimensions.  
5. Re-run the same validation suite.  
6. **Do not commit. Do not push.** Owner review required.

### Explicit non-actions

- Do not restart Sprint 14/15 product work from scratch  
- Do not regenerate RC1 reports wholesale  
- Do not touch `/home/bryan/Projects/waypoint-importer`  
- Do not fix Steepleaf `/explore/` unless owner expands scope  
- Do not claim public RC1 readiness

---

## 9. Sprint completion verdict (pre-Phase-2)

| Label | Verdict |
| --- | --- |
| User “Sprint 14” | **No labeled deliverables** — map to Sprint 10 assessment package → **substantively complete** |
| User “Sprint 15” | **No labeled deliverables** — map to Sprint 10 gate fixes + validation → **substantively complete after LI score fix + undo accidental commit** |
| Public RC1 ship decision | **Still No** (decision B stands) |

---

## 10. Phase 2 execution log

| Action | Result |
| --- | --- |
| Mixed reset `d172523` → `96f3963` | Done — zip no longer in git history; tip matches `origin/main` |
| LI Overall 6.5 → 7.1 + Overall methodology note | Done in `RC1-APPLICATION-SCORECARDS.md` |
| Re-run validation suite | Assets/recovery/repair/contact/reliability/knowledge/sprint9 **PASS**; links **FAIL** (1 pre-existing Steepleaf `/explore/`) |
| Commit / push | **Not performed** |
