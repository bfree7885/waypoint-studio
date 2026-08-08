# Global Signals Live Articles — Owner Review

**Branch:** `feature/global-signals-live-data-architecture`  
**Status:** Ready for owner review — **do not merge until approved**  
**Architecture:** `docs/global-signals/live-data-architecture.md`

## Recommendation

**Approve for staged merge after review** of trust labeling and source coverage. The production Articles path is live (`mode: live`), demo briefs were moved to fixtures, and the e2e chain runs on a real Federal Register Section 232 notice. Remaining gaps (EU/UK/UN adapters, CISA 403, richer citizen chains) are documented blockers — not silent fabrications.

## Documented end-to-end event

| Field | Value |
| --- | --- |
| Headline | Request for Public Comments on the Proposed Implementation of Duties on Additional Aluminum, Steel, and Copper Derivative Articles Under Section 232 |
| Publisher | Federal Register |
| Published | 2026-08-06T12:00:00.000Z |
| Source URL | https://www.federalregister.gov/documents/2026/08/06/2026-15961/request-for-public-comments-on-the-proposed-implementation-of-duties-on-additional-aluminum-steel |
| Article id | `gsa_live_e688949c` |
| Event id | `gse_fr_e2d1a4d7` |
| Event type | tariffs |
| Industry exposure (graph) | Automotive |
| Citizen impacts (graph) | none for this event (honest empty) |
| Waypoint’s Take | Generated — VERIFIED provenance + ANALYSIS over coded steel→automotive edge |

### Chain exercised

`Federal Register API → federal-register adapter → normalized event → graph activation (steel/US/automotive rules) → impact propagation → live article + deterministic Take → `/side-trails/global-signals/articles/``

## Live run metrics (2026-08-08T02:03:53Z)

| Metric | Value |
| --- | --- |
| Live articles | 40 |
| Waypoint’s Takes | 40 |
| Normalized events retained | 49 (cap applies at article build) |
| Active sources / attempted | 7 / 7 |
| Source failures | 0 |
| Source health | healthy |
| Newest event timestamp | 2026-08-07T12:00:00.000Z |
| Graph entities | 36 |
| Graph relationships | 23 |
| Active entities / relationships | 10 / 9 |
| Impacts total | 19 (1st: 17 · 2nd: 2 · 3rd: 0) |
| Industries currently exposed | Automotive, Energy |
| Citizen categories currently exposed | Fuel prices, Transportation, Utilities |

## Connected sources

1. **Federal Register API** — OFAC, BIS, USTR, CBP agency documents  
2. **USGS** — significant earthquakes GeoJSON (M≥6)  
3. **NOAA RSS** — filtered natural-hazard features only  
4. **U.S. State Department RSS** — connected; 0 matching items this run after filters  

Disconnected / blocked (honest): CISA advisories XML (HTTP 403); direct OFAC SDN bulk XML (timeout) — sanctions covered via Federal Register instead.

## Refresh frequency

**Every 6 hours** (cron `15 */6 * * *`) + `workflow_dispatch`  
Workflow: `.github/workflows/global-signals-ingest.yml`  
Pages note: artifact commits can trigger Pages when on the Pages source branch; 6h cadence bounds redeploys. Prefer keeping this on the feature branch until merge.

## Fixtures vs production

| Path | Mode | Role |
| --- | --- | --- |
| `data/global-signals/fixtures/articles/articles.json` | `sample-demo` | Tests only |
| `data/global-signals/articles/articles.json` | `live` | Production UI |
| `design-system/js/global-signals/wds-gs-loader.js` | gate | Refuses demo modes in production mounts |

## Screenshots

- `docs/global-signals/live-articles/01-live-articles-feed-desktop.png`
- `docs/global-signals/live-articles/02-live-articles-feed-mobile.png`
- `docs/global-signals/live-articles/03-live-article-detail-desktop.png`
- Index: `docs/global-signals/live-articles/SCREENSHOT-INDEX.md`

## Tests

```bash
node automation/test-global-signals-live-data.mjs
node automation/test-global-signals-articles.mjs
node automation/test-global-signals-live-e2e.mjs
node scripts/global-signals/run-live-pipeline.mjs   # real network ingest
```

## Trust checklist

- [x] No demo articles in production path  
- [x] No full copyrighted text republished  
- [x] Take separates VERIFIED vs ANALYSIS  
- [x] No take invention when evidence missing (generator returns null)  
- [x] Predicted impact hops never Observed  
- [x] Freshness/status exposed on Articles  
- [x] Source failures recorded honestly  

## Follow-ups (non-blocking)

- Wire Industry Intelligence / Citizen Impact HTML modules from parallel feature branches to `live-impacts.json`  
- Add EU/UK/UN/port-authority adapters when licensed public endpoints are confirmed  
- Expand citizen graph edges where evidence exists (steel→consumer goods remains intentionally sparse)
