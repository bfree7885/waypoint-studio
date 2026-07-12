# Review Production

## Purpose

Inspect production health without starting feature work.

## Command

```bash
node engineering/orchestrator/run.mjs "Review Production"
```

## Required checks

```bash
node automation/verify-production-build.mjs
node automation/check-production-nav.mjs
```

Optional:

```bash
curl -sL https://waypointstudio.org/status.html | head
curl -sL https://waypointstudio.org/data/build-info.json
```

## Update

Write results into `engineering/production/status.json` and, if failing, run **Fix Production**.
