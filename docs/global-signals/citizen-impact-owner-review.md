# Owner Review — Global Signals Citizen Impact

**Date:** 2026-08-07  
**Branch:** `feature/global-signals-citizen-impact`  
**Base:** `origin/main` @ `f942c7b` (Global Signals Sprint 1 live)  
**Author / committer:** Bryan Freeman \<bfree7885@gmail.com\>  
**Deployed:** No  
**Merged:** No — **stop for owner review; do not merge**

## Verdict

**Approve for owner review; do not merge until sign-off.**

Citizen Impact ships an eight-category sample/demo literacy shell that translates
illustrative world-event patterns into everyday categories (Food through
Technology). Every statement answers what changed, why, what caused it,
confidence, and time horizon, with entity ids, evidence, and cause chains.
Dataset is explicitly labeled sample/demo — not live news. Tone stays
evidence-first and non-political.

## Starting / ending SHAs

| Role | SHA |
| --- | --- |
| Start (`origin/main`) | `f942c7b177512b59bf3807c28814ccbe69820c2c` |
| End (tip) | `4f3a6ee9083c7344ee4d661dffb6b5b13b98dded` |

## Route

| Route | Role |
| --- | --- |
| `/side-trails/global-signals/citizen-impact/` | Citizen Impact board (8 sections) |
| `/side-trails/global-signals/` | Landing link updated |
| `/side-trails/global-signals/articles/?id=<gsa_*>` | Soft-links from related statements |

## Data paths

| Path | Role |
| --- | --- |
| `data/global-signals/citizen-impact/citizen-impact.json` | Sample/demo dataset |
| `docs/global-signals/citizen-impact-data-model.md` | Schema contract |
| `design-system/js/global-signals/wds-gs-citizen-impact.js` | Runtime |
| `design-system/css/wds-global-signals-citizen-impact.css` | Styles |
| `side-trails/global-signals/citizen-impact/index.html` | Page |

## Sections covered

Food · Fuel · Utilities · Housing · Travel · Healthcare · Insurance · Technology

Each statement includes: What changed? · Why? · What caused it? · Confidence ·
Time horizon · Cause chain (`gsn_*`) · Evidence · Related articles (`gsa_*` when tagged).

## Confidence / horizon

- Shared with Articles: Observed · High · Medium · Low · Unknown  
- Horizons: Immediate · Days · Weeks · Months · Long-term  
- Statement + cause-chain hops use `predicted: true` normalization — **Observed never** for downstream/impact claims.

## Relationship Explorer linkage

- Soft-link to `/side-trails/global-signals/relationships/` **deferred** — route not on `origin/main` yet.  
- Stable `gsn_*` entity ids align with Relationship Explorer demo entities for later join.  
- Current main placeholder `/relationship-graph/` remains linked from the page.

## Tests

| Suite | Result |
| --- | --- |
| `automation/test-global-signals-citizen-impact.mjs` | Pass |
| `automation/test-global-signals-citizen-impact-docs.mjs` | Pass |
| `automation/test-global-signals.mjs` | Pass (Citizen Impact graduated from placeholder) |
| `automation/test-global-signals-articles.mjs` | Pass (no Articles regression) |

Coverage: sections render, missing fields, confidence/horizon normalize, nav,
Side Trails/GS landing integration, outdoor Articles untouched.

## Screenshots

See [`docs/global-signals/citizen-impact/SCREENSHOT-INDEX.md`](citizen-impact/SCREENSHOT-INDEX.md)
and PNGs under `docs/global-signals/citizen-impact/`.

## Limitations

- Sample/demo only — not live ingest.  
- Eight categories (owner brief); design doc still mentions a broader eleven-card set as directional.  
- Cause chains are structured lists, not an interactive graph.  
- Relationship Explorer soft-link pending that route on main.  
- One statement per category in V1 demo — enough to prove the contract, not a full board.

## Recommendation

**Do not merge.** Review the sample/demo honesty labeling, eight-section coverage,
confidence rules, and entity-id alignment with Relationship Explorer before any
release decision. Push-only feature branch for owner inspection.
