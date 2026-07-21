# Baseline test results — waypoint-studio @ f68c5b2

Branch: `recovery/rc3-consolidation`
Date: 2026-07-21T02:36:39Z

### inject-build-metadata

```
$ GITHUB_SHA=f68c5b2ef1a1d40eaa979ea71088451096fb5c33 WAYPOINT_BUILD_SOURCE=baseline-audit node scripts/inject-build-metadata.mjs
{
  "ok": true,
  "root": "/home/bryan/Projects/waypoint-studio",
  "shortCommit": "f68c5b2",
  "commit": "f68c5b2ef1a1d40eaa979ea71088451096fb5c33",
  "source": "baseline-audit",
  "workflowRunId": null,
  "stampedHtml": 61
}
```

**Result:** PASS (0s)

### validate-production-assets

```
$ node automation/validate-production-assets.mjs
Production asset validation
HTML refs: 560 CSS imports: 53 JS modules: 150
Missing: 0

OK — all required assets resolve.
Wrote docs/PRODUCTION-ASSET-AUDIT.md
```

**Result:** PASS (0s)

### validate-production-links

```
$ node automation/validate-production-links.mjs
Production link validation
Checked local refs: 1705
Broken: 0
Warnings: 6

Warnings (sample):
- articles/categories/create/index.html — empty aria-busy mount without boot shell
- articles/categories/field-craft/index.html — empty aria-busy mount without boot shell
- articles/categories/observe/index.html — empty aria-busy mount without boot shell
- articles/categories/outdoor-intelligence/index.html — empty aria-busy mount without boot shell
- articles/categories/share/index.html — empty aria-busy mount without boot shell
- articles/categories/understand/index.html — empty aria-busy mount without boot shell

Wrote docs/PRODUCTION-BROKEN-ROUTE-REPORT.md

OK — no broken production links detected.
```

**Result:** PASS (0s)

### test-production-recovery

```
$ node automation/test-production-recovery.mjs
PASS LIVE_URL site-root
PASS HEALTH_URL site-root
PASS data files exist
PASS health file exists
PASS isFiniteCoord exported
PASS isFiniteCoord null false
PASS isFiniteCoord undefined false
PASS isFiniteCoord '' false
PASS isFiniteCoord 0 true
PASS isFiniteCoord 41.3 true
PASS isFiniteCoord '41.3' true
PASS nws null coords unavailable
PASS nws null-island unavailable
PASS routeHref /map/ → map/
PASS map redirect page
PASS map redirects to sheds
PASS platform-boot.js exists
PASS platform-boot.css exists
PASS wds.js lists platform-boot
PASS wds.css imports boot css
PASS steepleaf quote fix
PASS steepleaf explore catch
PASS steepleaf entity catch
PASS foragecast formatRegionLabel
PASS foragecast rejects null name

All production recovery tests passed.
```

**Result:** PASS (0s)

### test-production-repair

```
$ node automation/test-production-repair.mjs
PASS platformBoot present
PASS boot has product
PASS boot has progress
PASS fail has retry
PASS routeHref strips slash
PASS old site-root return gone
PASS sheds map route relative
PASS sheds no absolute map
PASS savant boot shell
PASS savant not empty busy
PASS foragecast boot shell
PASS foragecast no Opening outdoor
PASS steepleaf boot branded
PASS steepleaf no Preparing…
PASS scenes photo-coach redirects
PASS nav photo coach live path
PASS home single primary lead
PASS wds loads platform-boot
PASS wds imports boot css
PASS exists docs/PRODUCTION-REPAIR-REPORT.md
PASS exists docs/PRODUCTION-REPAIR-CHANGELOG.md
PASS exists docs/PRODUCTION-ROUTING-MAP.md
PASS exists docs/PRODUCTION-SHARED-COMPONENT-CHANGES.md
PASS exists docs/PRODUCTION-CONTENT-CLEANUP.md
PASS exists docs/PRODUCTION-REMAINING-ISSUES.md
PASS exists docs/PRODUCTION-TECHNICAL-DEBT.md
PASS exists docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md

All production repair tests passed.
```

**Result:** PASS (0s)

### test-platform-foundation

```
$ node automation/test-platform-foundation.mjs
PASS catalog has core products
PASS catalog has foundations
PASS resolve sheds href
PASS resolve studio home
PASS resolve dashboard app
PASS nav config has apps
PASS nav categories
PASS shell apps launcher control
PASS shell local nav
PASS shell marks current feature
PASS profile private default
PASS profile saves
PASS locations save
PASS collections favorites
PASS settings sync off
PASS subscription readiness
PASS foundation render
PASS envelope id
PASS envelope privacy
PASS extension set
PASS future data disabled
PASS future gis blocked
PASS no marketplace hook name
PASS sheds species count
PASS shed find private
PASS steepleaf tea store
PASS signalterrain receiver
PASS savant site
PASS fieldry categories
PASS life list empty total
PASS foundation json apps/shed-hunting/data/foundation.json
PASS foundation json apps/steepleaf/data/foundation.json
PASS foundation json apps/signalterrain/data/foundation.json
PASS foundation json apps/savant-sommelier/data/foundation.json

All platform foundation tests passed.
```

**Result:** PASS (0s)

