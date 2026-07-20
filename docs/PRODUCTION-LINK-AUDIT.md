# Production Link Audit

**Generated:** 2026-07-20 04:33 UTC  
**Artifacts:** `reports/production-link-audit.json`, `reports/production-link-audit.csv`

## Executive finding

Production link graph for deployed `761b202` is largely intact for apps that existed at that commit.  
Critical failures are **routes on `origin/main` never deployed**, plus a **CI gate** preventing deployment.

## Categories

| Category | Count | Examples |
| --- | ---: | --- |
| Broken internal route (404) | 5 | LI index/field/learn, Scholar, University |
| Present in `main`, absent in production | Many | Recoveries after `761b202`, LI, Dashboard V2, Experience V2, Contact hero |
| Deploy pipeline broken | Continuous since `761b202` | Pages fails on Steepleaf `/explore/` |
| Dead controls | 0 | — |
| Broken assets | 0 | — |
| Host redirects | Healthy | www→apex 301; http→https 301 |

## Root blocker

```
apps/steepleaf/data/foundation.json → /explore/
```

`pages.yml` hard-fails on `validate-production-links.mjs` before upload. Identical failure locally and in Actions.

## Hosting evidence

- DNS → GitHub Pages
- `server: GitHub.com`
- Workflow: `.github/workflows/pages.yml`
- Last success: `761b202` @ 2026-07-19T16:27:35Z
- Later runs including `081965d`: **failure**
