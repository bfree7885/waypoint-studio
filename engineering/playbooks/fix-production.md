# Fix Production

## Purpose

Pause feature work, create a P0 incident task, and run the incident pipeline.

## Command

```bash
node engineering/orchestrator/run.mjs "Fix Production"
```

## Effects

- `productionPauseFeatures: true`
- Mode → `production_incident`
- New `WE-###` P0 task in backlog
- Active agent starts at DevOps

## Sequence

DevOps + QA triage → fix (Frontend/Backend/DevOps) → verify → document → CEO

## Exit criteria

- CI green
- Pages deploy healthy
- Build marker matches `origin/main`
- Navigation verification passes
- Incident report in `engineering/reports/`
- Feature pause cleared by Release Manager / CEO
